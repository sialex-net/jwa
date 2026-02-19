import { parseSubmission, report, useForm } from '@conform-to/react/future';
import * as ReactEmail from '@react-email/components';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { MetaFunction } from 'react-router';
import { data, Form, Link, redirect, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireAnonymous } from '@/app/utils/auth.server';
import { ProviderConnectionForm } from '@/app/utils/connections';
import { sendEmail } from '@/app/utils/email.server';
import { EmailSchema } from '@/app/utils/user-validation';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/signup';
import { prepareVerification } from './verify.server';

const SignupFormSchema = z.object({
	email: EmailSchema,
	redirectTo: z.string().optional(),
});

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	await requireAnonymous(env, request);
	return {};
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	await requireAnonymous(env, request);
	let formData = await request.formData();
	let submission = parseSubmission(formData);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = SignupFormSchema.superRefine(async (data, ctx) => {
		let existingEmail = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.email, data.email))
			.get();

		if (existingEmail) {
			ctx.addIssue({
				code: 'custom',
				message: 'Email already registered',
				path: ['email'],
			});
		}
	});

	let result = await superRefined.safeParseAsync(submission.payload);

	client.close();

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

	let { email, redirectTo: postVerificationRedirectTo } = result.data;

	let { verifyUrl, redirectTo, otp } = await prepareVerification({
		period: 10 * 60, // valid for 10 minutes
		redirectTo: postVerificationRedirectTo,
		request,
		target: email,
		type: 'onboarding',
	});

	let response = await sendEmail(env, {
		react: (
			<SignupEmail
				onboardingUrl={verifyUrl.toString()}
				otp={otp}
			/>
		),
		subject: 'Welcome to John Wicki',
		to: email,
	});

	if (response?.status === 'success') {
		return redirect(redirectTo.toString());
	} else {
		return data(
			{
				result: report(submission, {
					error: {
						formErrors: [response.error.message],
					},
				}),
			},
			{ status: 500 },
		);
	}
}

export function SignupEmail({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string;
	otp: string;
}) {
	return (
		<ReactEmail.Html
			dir="ltr"
			lang="en"
		>
			<ReactEmail.Container>
				<h1>
					<ReactEmail.Text>Welcome to John Wicki!</ReactEmail.Text>
				</h1>
				<p>
					<ReactEmail.Text>
						Here's your verification code: <strong>{otp}</strong>
					</ReactEmail.Text>
				</p>
				<p>
					<ReactEmail.Text>Or click the link to get started:</ReactEmail.Text>
				</p>
				<ReactEmail.Link href={onboardingUrl}>{onboardingUrl}</ReactEmail.Link>
			</ReactEmail.Container>
		</ReactEmail.Html>
	);
}

export const meta: MetaFunction = () => {
	return [{ title: 'Setup John Wicki Account' }];
};

export default function Component({ actionData }: Route.ComponentProps) {
	let [searchParams] = useSearchParams();
	let redirectTo = searchParams.get('redirectTo');

	let { fields, form } = useForm(SignupFormSchema, {
		id: 'signup-form',
		lastResult: actionData?.result,
	});

	let emailAlreadyRegisteredError = fields.email?.errors?.includes(
		'Email already registered',
	);

	return (
		<div className="container flex flex-col items-center">
			<header className="container flex flex-col items-center gap-3">
				<h1 className="text-2xl">Account Sign-up</h1>
				<p className="text-muted-foreground">Please enter your email</p>
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
							!fields.email.valid
								? fields.email.errorId
								: fields.email.descriptionId
						}
						aria-invalid={!fields.email.valid ? true : undefined}
						autoComplete="email"
						autoFocus={true}
						className="peer pt-7 lowercase leading-5"
						defaultValue={fields.email.defaultValue}
						id={fields.email.id}
						name={fields.email.name}
						placeholder=""
						type="email"
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
						Please enter your email
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.email.errorId}
					>
						{fields.email.errors}
					</div>
				</div>
				<div className="flex min-h-12 flex-col gap-y-2 pt-1">
					<ErrorList
						errors={form.errors}
						id={form.errorId}
					/>
					{emailAlreadyRegisteredError ? (
						<p className="text-xs">
							Email already registered.{' '}
							<Link
								className="underline hover:no-underline"
								to="/login"
							>
								Log in
							</Link>{' '}
							or{' '}
							<Link
								className="underline hover:no-underline"
								to="/forgot-password"
							>
								reset password
							</Link>
							?
						</p>
					) : null}
				</div>
				<div className="flex items-center justify-between gap-6">
					<Button
						className="w-full text-lg"
						type="submit"
					>
						Submit
					</Button>
				</div>
			</Form>
			<div className="mt-5 flex flex-col gap-5 border-border border-t-2 border-b-2 py-3">
				<ProviderConnectionForm
					providerName="github"
					redirectTo={redirectTo}
					type="Signup"
				/>
			</div>
			<Spacer size="xs" />
			<p>
				Already have an account?{' '}
				<Link
					className="underline hover:no-underline"
					prefetch="intent"
					to="/login"
				>
					Log In
				</Link>
			</p>
			<Spacer size="3xs" />
			<p>
				<Link
					className="underline hover:no-underline"
					prefetch="intent"
					to="/forgot-password"
				>
					Forgot password?
				</Link>
			</p>
		</div>
	);
}
