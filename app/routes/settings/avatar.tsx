import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { invariantResponse } from '@epic-web/invariant';
import { parseFormData } from '@remix-run/form-data-parser';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { data, Form, redirect } from 'react-router';
import { ServerOnly } from 'remix-utils/server-only';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import { getUserImgSrc } from '@/app/utils/images';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/avatar';

export const handle = {
	breadcrumb: <Icon name="avatar">Photo</Icon>,
};

const MAX_SIZE = 1024 * 1024 * 3; // 3MB

const AvatarFormSchema = z.object({
	avatarFile: z
		.instanceof(File)
		.refine((file) => file.size > 0, 'Image is required')
		.refine(
			(file) => file.size <= MAX_SIZE,
			'Image size must be less than 3MB',
		),
});

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let query = await db
		.select({
			userAvatar: { id: schema.userAvatar.id },
			users: { username: schema.users.username },
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.leftJoin(schema.userAvatar, eq(schema.users.id, schema.userAvatar.userId))
		.get();

	invariantResponse(query, `userId ${userId} does not exist`, {
		status: 404,
	});

	return { user: { avatar: { ...query.userAvatar }, ...query.users } };
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let formData = await parseFormData(request, {
		maxFileSize: MAX_SIZE,
	});

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let intent = formData.get('intent');
	if (intent === 'delete') {
		await db
			.delete(schema.userAvatar)
			.where(eq(schema.userAvatar.userId, userId));
		return redirect('/settings');
	}

	let submission = parseSubmission(formData);

	let transformed = AvatarFormSchema.transform(async (data) => {
		if (data.avatarFile && data.avatarFile?.size <= 0) return z.NEVER;
		return {
			image: {
				blob: await data.avatarFile.arrayBuffer(),
				contentType: data.avatarFile.type,
			},
		};
	});

	let result = await transformed.safeParseAsync(submission.payload);

	if (!result.success) {
		return data(
			{
				result: report(submission, {
					error: {
						issues: result.error.issues,
					},
				}),
			},
			{ status: 400 },
		);
	}

	let { image } = result.data;

	let query = await db
		.select({
			userAvatar: { id: schema.userAvatar.id },
			users: { username: schema.users.username },
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.leftJoin(schema.userAvatar, eq(schema.users.id, schema.userAvatar.userId))
		.get();

	invariantResponse(query, `userId ${userId} does not exist`, {
		status: 404,
	});

	let avatar = {
		altText: `Avatar for ${query.users.username}`,
		blob: image.blob,
		contentType: image.contentType,
		id: query.userAvatar?.id ?? nanoid(),
		userId,
	};

	await db
		.insert(schema.userAvatar)
		.values(avatar)
		.onConflictDoUpdate({
			// new id for cache busting
			set: { ...avatar, id: nanoid() },
			target: schema.userAvatar.id,
		});

	return redirect('/settings');
}

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	let { form, fields } = useForm(AvatarFormSchema, {
		id: 'profile-photo',
		lastResult: actionData?.result,
		onValidate: ({ error, formData }) => {
			if (formData.get('intent') === 'delete') return;
			return { error };
		},
	});

	let [newImageSrc, setNewImageSrc] = React.useState<null | string>(null);

	return (
		<div>
			<Form
				className="flex flex-col items-center justify-center gap-10"
				encType="multipart/form-data"
				method="POST"
				onReset={() => setNewImageSrc(null)}
				{...form.props}
			>
				<img
					alt={loaderData.user?.username}
					className="h-52 w-52 rounded-full object-cover"
					src={
						newImageSrc ??
						(loaderData.user ? getUserImgSrc(loaderData.user.avatar?.id) : '')
					}
				/>
				<ErrorList
					errors={fields.avatarFile.errors}
					id={fields.avatarFile.id}
				/>
				<input
					accept="image/*"
					className="peer sr-only"
					id={fields.avatarFile.id}
					name={fields.avatarFile.name}
					onChange={(e) => {
						let file = e.currentTarget.files?.[0];
						if (file) {
							let reader = new FileReader();
							reader.onload = (event) => {
								setNewImageSrc(event.target?.result?.toString() ?? null);
							};
							reader.readAsDataURL(file);
						}
					}}
					tabIndex={newImageSrc ? -1 : 0}
					type="file"
				/>
				{newImageSrc ? (
					<div className="flex gap-4">
						<Button type="submit">Save Photo</Button>
						<Button
							type="reset"
							variant="secondary"
						>
							Reset
						</Button>
					</div>
				) : (
					<div className="flex gap-4 peer-invalid:[&>.server-only[type='submit']]:hidden">
						<Button
							className="cursor-pointer"
							render={(props) => (
								<label
									htmlFor={fields.avatarFile.id}
									{...props}
								>
									<Icon name="pencil-1">Change</Icon>
								</label>
							)}
						/>

						{/* This is here for progressive enhancement. If the client doesn't
						hydrate (or hasn't yet) this button will be available to submit the
						selected photo. */}
						<ServerOnly>
							{() => (
								<Button
									className="server-only"
									type="submit"
								>
									Save Photo
								</Button>
							)}
						</ServerOnly>
						{loaderData.user.avatar?.id ? (
							<Button
								name="intent"
								type="submit"
								value="delete"
								variant="destructive"
							>
								<Icon name="trash">Delete</Icon>
							</Button>
						) : null}
					</div>
				)}
				<ErrorList errors={form.errors} />
			</Form>
		</div>
	);
}
