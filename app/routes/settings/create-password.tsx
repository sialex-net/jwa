import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data, Form, Link, redirect } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { getPasswordHash, requireUserId } from '@/app/utils/auth.server';
import { PasswordSchema } from '@/app/utils/user-validation';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/create-password';

export const handle = {
	breadcrumb: <Icon name="dots-horizontal">Password</Icon>,
};

const CreatePasswordFormSchema = z
	.object({
		confirmNewPassword: PasswordSchema,
		newPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				code: 'custom',
				message: 'The passwords must match',
				path: ['confirmNewPassword'],
			});
		}
	});

async function requireNoPassword(userId: string) {
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	let password = await db
		.select({ userId: schema.passwords.userId })
		.from(schema.passwords)
		.where(eq(schema.passwords.userId, userId))
		.get();

	if (password) {
		throw redirect('/settings/password');
	}
}

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	await requireNoPassword(userId);
	return {};
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	await requireNoPassword(userId);
	let formData = await request.formData();
	let submission = parseSubmission(formData);
	let result = await CreatePasswordFormSchema.safeParseAsync(
		submission.payload,
	);

	if (!result.success) {
		return data(
			{
				result: report(submission, {
					error: {
						issues: result.error.issues,
					},
					hideFields: ['newPassword', 'confirmNewPassword'],
				}),
			},
			{ status: 400 },
		);
	}

	let { newPassword } = result.data;
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	await db
		.insert(schema.passwords)
		.values({ hash: await getPasswordHash(newPassword), userId });

	return redirect('/settings');
}

export default function Component({ actionData }: Route.ComponentProps) {
	let { fields, form } = useForm(CreatePasswordFormSchema, {
		id: 'signup-form',
		lastResult: actionData?.result,
	});
	return (
		<Form
			className="mx-auto max-w-md"
			method="POST"
			{...form.props}
		>
			<div className="relative">
				<Input
					autoComplete="password"
					className="peer pt-7 leading-5"
					defaultValue={fields.newPassword.defaultValue}
					id={fields.newPassword.id}
					name={fields.newPassword.name}
					type="password"
				/>
				<Label
					className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.newPassword.id}
				>
					Password
				</Label>
				<div className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs">
					{fields.newPassword.errors}
				</div>
			</div>
			<div className="relative">
				<Input
					autoComplete="password"
					className="peer pt-7 leading-5"
					defaultValue={fields.confirmNewPassword.defaultValue}
					id={fields.confirmNewPassword.id}
					name={fields.confirmNewPassword.name}
					type="password"
				/>
				<Label
					className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.confirmNewPassword.id}
				>
					Confirm Password
				</Label>
				<div className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs">
					{fields.confirmNewPassword.errors}
				</div>
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
				<Button type="submit">Create Password</Button>
			</div>
		</Form>
	);
}
