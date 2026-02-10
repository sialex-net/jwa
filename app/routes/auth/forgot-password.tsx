import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { invariant } from '@epic-web/invariant';
import { eq, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data, Link, redirect, useFetcher } from 'react-router';
import { z } from 'zod';
import { GeneralErrorBoundary } from '@/app/components/error-boundary';
import { ErrorList } from '@/app/components/forms';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { sendEmail } from '@/app/utils/email.server';
import { EmailSchema, UsernameSchema } from '@/app/utils/user-validation';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/forgot-password';
import { prepareVerification } from './verify.server';

const ForgotPasswordFormSchema = z.object({
	usernameOrEmail: z.union([EmailSchema, UsernameSchema]),
});

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let formData = await request.formData();
	let submission = parseSubmission(formData);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = ForgotPasswordFormSchema.superRefine(async (data, ctx) => {
		let user = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(
				or(
					eq(schema.users.email, data.usernameOrEmail),
					eq(schema.users.username, data.usernameOrEmail),
				),
			)
			.get();
		if (!user) {
			ctx.addIssue({
				code: 'custom',
				message: 'No user exists with this username or email',
				path: ['usernameOrEmail'],
			});
			return;
		}
	});

	let result = await superRefined.safeParseAsync(submission.payload);

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

	let { usernameOrEmail } = result.data;

	let user = await db
		.select({ email: schema.users.email, username: schema.users.username })
		.from(schema.users)
		.where(
			or(
				eq(schema.users.email, usernameOrEmail),
				eq(schema.users.username, usernameOrEmail),
			),
		)
		.get();

	invariant(user, 'Not found');

	let { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60,
		request,
		target: usernameOrEmail,
		type: 'reset-password',
	});

	let response = await sendEmail(env, {
		subject: `Epic Notes Password Reset`,
		text: `Here's your code: ${otp}. Or open this: ${verifyUrl.toString()}`,
		to: user.email,
	});

	if (response.status === 'success') {
		return redirect(redirectTo.toString());
	} else {
		return data(
			{
				result: report(submission, {
					error: {
						formErrors: [response.error],
					},
				}),
			},
			{ status: 500 },
		);
	}
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Password Recovery for Epic Notes' }];
};

export default function Component() {
	let forgotPassword = useFetcher<typeof action>();

	let { form, fields } = useForm(ForgotPasswordFormSchema, {
		id: 'forgot-password-form',
		lastResult: forgotPassword.data?.result,
	});

	return (
		<div className="container flex flex-col items-center">
			<header className="container flex flex-col items-center gap-3">
				<h1 className="text-2xl">Forgot Password</h1>
				<p className="text-muted-foreground">
					Please enter your email or username
				</p>
			</header>
			<forgotPassword.Form
				className="container mx-2 flex max-w-xl flex-col gap-y-2 pt-8"
				method="POST"
				{...form.props}
			>
				<div className="relative">
					<Input
						aria-describedby={
							!fields.usernameOrEmail.valid
								? fields.usernameOrEmail.errorId
								: fields.usernameOrEmail.descriptionId
						}
						aria-invalid={!fields.usernameOrEmail.valid ? true : undefined}
						autoFocus={true}
						className="peer pt-7 lowercase leading-5"
						defaultValue={fields.usernameOrEmail.defaultValue}
						id={fields.usernameOrEmail.id}
						name={fields.usernameOrEmail.name}
						placeholder=""
						type="text"
					/>
					<Label
						className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
						htmlFor={fields.usernameOrEmail.id}
					>
						Email or Username
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.usernameOrEmail.descriptionId}
					>
						Please enter your email or username
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.usernameOrEmail.errorId}
					>
						{fields.usernameOrEmail.errors}
					</div>
				</div>
				<ErrorList
					errors={form.errors}
					id={form.errorId}
				/>

				<div className="mt-6">
					<Button
						className="w-full"
						type="submit"
					>
						Recover password
					</Button>
				</div>
			</forgotPassword.Form>
			<Spacer size="xs" />
			<Link
				className="underline hover:no-underline"
				to="/login"
			>
				Back to Login
			</Link>
		</div>
	);
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
