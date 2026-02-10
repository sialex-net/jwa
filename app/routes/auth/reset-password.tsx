import { parseSubmission, report, useForm } from '@conform-to/react/future';
import type { MetaFunction } from 'react-router';
import { data, Form, redirect } from 'react-router';
import { z } from 'zod';
import { GeneralErrorBoundary } from '@/app/components/error-boundary';
import { ErrorList } from '@/app/components/forms';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { requireAnonymous, resetUserPassword } from '@/app/utils/auth.server';
import { PasswordSchema } from '@/app/utils/user-validation';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import { appContext, getContext } from '../../context';
import type { Route } from './+types/reset-password';

export const resetPasswordUsernameSessionKey = 'resetPasswordUsername';

const ResetPasswordFormSchema = z
	.object({
		confirmPassword: PasswordSchema,
		password: PasswordSchema,
	})
	.refine(({ confirmPassword, password }) => password === confirmPassword, {
		message: 'The passwords did not match',
		path: ['confirmPassword'],
	});

async function requireResetPasswordUsername(env: Env, request: Request) {
	await requireAnonymous(env, request);
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let resetPasswordUsername = verifySession.get(
		resetPasswordUsernameSessionKey,
	);
	if (typeof resetPasswordUsername !== 'string' || !resetPasswordUsername) {
		throw redirect('/login');
	}
	return resetPasswordUsername;
}

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let resetPasswordUsername = await requireResetPasswordUsername(env, request);
	return { resetPasswordUsername };
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let resetPasswordUsername = await requireResetPasswordUsername(env, request);
	let formData = await request.formData();
	let submission = parseSubmission(formData);
	let result = ResetPasswordFormSchema.safeParse(submission.payload);

	if (!result.success) {
		return data(
			{
				result: report(submission, {
					error: {
						issues: result.error.issues,
					},
					hideFields: ['confirmPassword', 'password'],
				}),
			},
			{ status: 400 },
		);
	}

	let { password } = result.data;

	await resetUserPassword({ password, username: resetPasswordUsername });
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	return redirect('/login', {
		headers: {
			'set-cookie':
				await getVerifySessionStorage(env).destroySession(verifySession),
		},
	});
}

export const meta: MetaFunction = () => {
	return [{ title: 'Reset Password | Epic Notes' }];
};

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	let data = loaderData;

	let { form, fields } = useForm(ResetPasswordFormSchema, {
		id: 'reset-password',
		lastResult: actionData?.result,
	});

	return (
		<div className="container flex flex-col items-center">
			<header className="container flex flex-col items-center gap-3">
				<h1 className="text-h1">Password Reset</h1>
				<p className="text-body-md text-muted-foreground">
					Hi, {data.resetPasswordUsername}
				</p>
			</header>
			<Spacer size="xs" />
			<Form
				className="container mx-2 flex max-w-xl flex-col gap-y-2 pt-8"
				method="POST"
				{...form.props}
			>
				<div className="relative">
					<Input
						aria-describedby={
							!fields.password.valid
								? fields.password.errorId
								: fields.password.descriptionId
						}
						aria-invalid={!fields.password.valid ? true : undefined}
						autoComplete="new-password"
						autoFocus={true}
						className="peer pt-7 lowercase leading-5"
						defaultValue={fields.password.defaultValue}
						id={fields.password.id}
						name={fields.password.name}
						placeholder=""
						type="password"
					/>
					<Label
						className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
						htmlFor={fields.password.id}
					>
						New password
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.password.descriptionId}
					>
						Please enter a new password
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.password.errorId}
					>
						{fields.password.errors}
					</div>
				</div>
				<div className="relative">
					<Input
						aria-describedby={
							!fields.confirmPassword.valid
								? fields.confirmPassword.errorId
								: fields.confirmPassword.descriptionId
						}
						aria-invalid={!fields.confirmPassword.valid ? true : undefined}
						autoComplete="new-password"
						className="peer pt-7 lowercase leading-5"
						defaultValue={fields.confirmPassword.defaultValue}
						id={fields.confirmPassword.id}
						name={fields.confirmPassword.name}
						placeholder=""
						type="password"
					/>
					<Label
						className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
						htmlFor={fields.confirmPassword.id}
					>
						Confirm password
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.confirmPassword.descriptionId}
					>
						Please confirm password
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.confirmPassword.errorId}
					>
						{fields.confirmPassword.errors}
					</div>
				</div>

				<ErrorList
					errors={form.errors}
					id={form.errorId}
				/>

				<Button
					className="w-full"
					type="submit"
				>
					Reset password
				</Button>
			</Form>
		</div>
	);
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
