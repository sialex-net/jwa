import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Link, redirect, useFetcher, useLoaderData } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import { getUserImgSrc } from '@/app/utils/images';
import { EmailSchema, UsernameSchema } from '@/app/utils/user-validation';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/home';

const ProfileFormSchema = z.object({
	email: EmailSchema,
	username: UsernameSchema,
});

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let user = await db
		.select({
			email: schema.users.email,
			id: schema.users.id,
			image: schema.userAvatar,
			username: schema.users.username,
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.leftJoin(schema.userAvatar, eq(schema.users.id, schema.userAvatar.userId))
		.get();

	invariantResponse(user, 'User not found', { status: 404 });

	return { user };
}

type ProfileActionArgs = {
	formData: FormData;
	request: Request;
	userId: string;
};
const profileUpdateActionIntent = 'update-profile';
const deleteDataActionIntent = 'delete-data';

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);

	let formData = await request.formData();
	let intent = formData.get('intent');

	switch (intent) {
		case deleteDataActionIntent: {
			return deleteDataAction({ formData, request, userId });
		}
		case profileUpdateActionIntent: {
			return profileUpdateAction({ formData, request, userId });
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 });
		}
	}
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<div className="flex flex-col gap-12">
			<div className="flex justify-center">
				<div className="relative h-52 w-52">
					<img
						alt={`Avatar for ${loaderData.user.username}`}
						className="h-full w-full rounded-full object-cover"
						src={getUserImgSrc(loaderData.user.image?.id)}
					/>
					<Button
						className="absolute top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-2 p-0"
						render={(props) => (
							<Link
								aria-label="Change profile photo"
								preventScrollReset
								title="Change profile photo"
								to="avatar"
								{...props}
							>
								<Icon
									className="size-4"
									name="camera"
								/>
							</Link>
						)}
						variant="outline"
					/>
				</div>
			</div>
			<UpdateProfile />

			<div className="col-span-6 my-6 h-1 border-foreground border-b-[1.5px]" />
			<div className="col-span-full flex flex-col gap-6">
				<div>
					<Link to="password">
						<Icon name="dots-horizontal">Change Password</Icon>
					</Link>
				</div>
				<div>
					<a
						download="john-wicki-user-data.json"
						href="/resources/download-user-data"
					>
						<Icon name="download">Download your data</Icon>
					</a>
				</div>
				<DeleteData />
			</div>
		</div>
	);
}

async function profileUpdateAction({ userId, formData }: ProfileActionArgs) {
	let submission = parseSubmission(formData);

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let superRefined = ProfileFormSchema.superRefine(
		async ({ email, username }, ctx) => {
			let existingUsername = await db
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(eq(schema.users.username, username))
				.get();
			if (existingUsername && existingUsername.id !== userId) {
				ctx.addIssue({
					code: 'custom',
					message: 'Username not available',
					path: ['username'],
				});
			}
			let existingEmail = await db
				.select({ id: schema.users.id })
				.from(schema.users)
				.where(eq(schema.users.email, email))
				.get();
			if (existingEmail && existingEmail.id !== userId) {
				ctx.addIssue({
					code: 'custom',
					message: 'Email already registered',
					path: ['email'],
				});
			}
		},
	);

	let result = await superRefined.safeParseAsync(submission.payload);

	if (!result.success) {
		return {
			result: report(submission, {
				error: {
					issues: result.error.issues,
				},
			}),
		};
	}

	await db
		.update(schema.users)
		.set({ email: result.data.email, username: result.data.username })
		.where(eq(schema.users.id, userId));

	return { result: report(submission) };
}

function UpdateProfile() {
	let loaderData = useLoaderData<typeof loader>();

	let fetcher = useFetcher<typeof profileUpdateAction>();

	let { form, fields } = useForm(ProfileFormSchema, {
		defaultValue: {
			email: loaderData.user.email,
			username: loaderData.user.username,
		},
		id: 'edit-profile',
		lastResult: fetcher.data?.result,
	});

	return (
		<fetcher.Form
			className="container mx-auto flex max-w-xl flex-col gap-y-2 pt-8"
			method="POST"
			{...form.props}
		>
			<div className="relative">
				<Input
					aria-describedby={
						!fields.email.valid
							? fields.email.errorId
							: fields.email.descriptionId
					}
					aria-invalid={!fields.email.valid ? true : undefined}
					className="peer pt-7 leading-5"
					defaultValue={fields.email.defaultValue}
					id={fields.email.id}
					name={fields.email.name}
					type="text"
				/>
				<Label
					className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.email.id}
				>
					Email
				</Label>
				<div
					aria-hidden={true}
					className="sr-only"
					id={fields.email.descriptionId}
				>
					Please enter a new email
				</div>
				<div
					aria-hidden={true}
					className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
					id={fields.email.errorId}
				>
					{fields.email.errors}
				</div>
			</div>
			<div className="relative">
				<Input
					aria-describedby={
						!fields.username.valid
							? fields.username.errorId
							: fields.username.descriptionId
					}
					aria-invalid={!fields.username.valid ? true : undefined}
					className="peer pt-7 leading-5"
					defaultValue={fields.username.defaultValue}
					id={fields.username.id}
					name={fields.username.name}
					type="text"
				/>
				<Label
					className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.username.id}
				>
					Username
				</Label>
				<div
					aria-hidden={true}
					className="sr-only"
					id={fields.username.descriptionId}
				>
					Please enter a new username
				</div>
				<div
					aria-hidden={true}
					className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
					id={fields.username.errorId}
				>
					{fields.username.errors}
				</div>
			</div>

			<ErrorList
				errors={form.errors}
				id={form.errorId}
			/>

			<div className="mt-8 flex justify-center">
				<Button
					name="intent"
					size="wide"
					type="submit"
					value={profileUpdateActionIntent}
				>
					Save changes
				</Button>
			</div>
		</fetcher.Form>
	);
}

async function deleteDataAction({ userId }: ProfileActionArgs) {
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	await db.delete(schema.users).where(eq(schema.users.id, userId));

	return redirect('/');
}

function DeleteData() {
	let fetcher = useFetcher<typeof deleteDataAction>();
	return (
		<div>
			<fetcher.Form method="POST">
				<Button
					name="intent"
					type="submit"
					value={deleteDataActionIntent}
					variant="destructive"
				>
					<Icon name="trash">Delete all your data</Icon>
				</Button>
			</fetcher.Form>
		</div>
	);
}
