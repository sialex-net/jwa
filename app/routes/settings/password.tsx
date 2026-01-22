import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, Link, redirect } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import {
	getPasswordHash,
	requireUserId,
	verifyUserPassword,
} from '@/app/utils/auth.server';
import { PasswordSchema } from '@/app/utils/user-validation';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/password';

export const handle = {
	breadcrumb: <Icon name="dots-horizontal">Password</Icon>,
};

const ChangePasswordFormSchema = z
	.object({
		confirmNewPassword: PasswordSchema,
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				code: 'custom',
				message: 'Passwords must match',
				path: ['confirmNewPassword'],
			});
		}
	});

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let formData = await request.formData();
	let submission = parseSubmission(formData);

	let superRefined = ChangePasswordFormSchema.superRefine(
		async ({ currentPassword, newPassword }, ctx) => {
			if (currentPassword && newPassword) {
				let user = await verifyUserPassword({ id: userId }, currentPassword);
				if (!user) {
					ctx.addIssue({
						code: 'custom',
						message: 'Incorrect password',
						path: ['currentPassword'],
					});
				}
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
				hideFields: ['currentPassword', 'newPassword', 'password'],
			}),
		};
	}

	let { newPassword } = result.data;

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	await db
		.update(schema.passwords)
		.set({ hash: await getPasswordHash(newPassword) })
		.where(eq(schema.passwords.userId, userId));

	return redirect(`/settings`);
}

export default function Component({ actionData }: Route.ComponentProps) {
	let { form, fields } = useForm(ChangePasswordFormSchema, {
		id: 'signup-form',
		lastResult: actionData?.result,
	});

	return (
		<Form
			className="container mx-auto flex max-w-xl flex-col gap-y-2 pt-8"
			method="POST"
			{...form.props}
		>
			<div className="relative">
				<Input
					autoComplete="current-password"
					className="peer pt-7 leading-5"
					defaultValue={fields.currentPassword.defaultValue}
					id={fields.currentPassword.id}
					name={fields.currentPassword.name}
					type="password"
				/>
				<Label
					className="peer-placeholder-shown:-translate-y-1/2 absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.currentPassword.id}
				>
					Current Password
				</Label>
				<div className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs">
					{fields.currentPassword.errors}
				</div>
			</div>
			<div className="relative">
				<Input
					autoComplete="new-password"
					className="peer pt-7 leading-5"
					defaultValue={fields.newPassword.defaultValue}
					id={fields.newPassword.id}
					name={fields.newPassword.name}
					type="password"
				/>
				<Label
					className="peer-placeholder-shown:-translate-y-1/2 absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.newPassword.id}
				>
					New Password
				</Label>
				<div className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs">
					{fields.newPassword.errors}
				</div>
			</div>
			<div className="relative">
				<Input
					autoComplete="new-password"
					className="peer pt-7 leading-5"
					defaultValue={fields.confirmNewPassword.defaultValue}
					id={fields.confirmNewPassword.id}
					name={fields.confirmNewPassword.name}
					type="password"
				/>
				<Label
					className="peer-placeholder-shown:-translate-y-1/2 absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.confirmNewPassword.id}
				>
					Confirm New Password
				</Label>
				{/* TODO: make component */}
				{fields.confirmNewPassword.errors ? (
					<div className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs">
						<ul className="flex gap-x-2">
							{fields.confirmNewPassword.errors.map((e) => (
								<li key={e}>{e}</li>
							))}
						</ul>
					</div>
				) : null}
			</div>
			<ErrorList
				errors={form.errors}
				id={form.errorId}
			/>
			<div className="grid w-full grid-cols-2 gap-6">
				<Button
					render={(props) => (
						<Link
							to=".."
							{...props}
						>
							Cancel
						</Link>
					)}
					variant="secondary"
				/>
				<Button type="submit">Change Password</Button>
			</div>
		</Form>
	);
}
