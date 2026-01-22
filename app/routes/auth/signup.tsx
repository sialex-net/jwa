import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { MetaFunction } from 'react-router';
import { data, Form, Link, redirect } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import {
	getSessionExpirationDate,
	requireAnonymous,
	signup,
	userIdKey,
} from '@/app/utils/auth.server';
import { getSessionStorage } from '@/app/utils/sessions.server';
import {
	EmailSchema,
	PasswordSchema,
	UsernameSchema,
} from '@/app/utils/user-validation';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/signup';

const SignupFormSchema = z
	.object({
		agreeToTermsOfServiceAndPrivacyPolicy: z.preprocess(
			(v) => v === 'on',
			z.boolean(),
		),
		confirmPassword: PasswordSchema,
		email: EmailSchema,
		password: PasswordSchema,
		remember: z.preprocess((v) => v === 'on', z.boolean()),
		username: UsernameSchema,
	})
	.superRefine(
		(
			{ confirmPassword, password, agreeToTermsOfServiceAndPrivacyPolicy },
			ctx,
		) => {
			if (confirmPassword !== password) {
				ctx.addIssue({
					code: 'custom',
					message: 'Passwords must match',
					path: ['confirmPassword'],
				});
			}

			if (!agreeToTermsOfServiceAndPrivacyPolicy) {
				ctx.addIssue({
					code: 'custom',
					message: 'You must agree to the terms of service and privacy policy',
				});
			}
		},
	);

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

		let existingUsername = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.username, data.username))
			.get();

		if (existingEmail) {
			ctx.addIssue({
				code: 'custom',
				message: 'Email already registered',
				path: ['email'],
			});
		}

		if (existingUsername) {
			ctx.addIssue({
				code: 'custom',
				message: 'Username not available',
				path: ['username'],
			});
		}
	}).transform(async (data) => {
		let user = await signup(data);
		return { ...data, user };
	});

	let result = await superRefined.safeParseAsync(submission.payload);

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

	let { user, remember } = result.data;

	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	cookieSession.set(userIdKey, user.id);

	return redirect('/', {
		headers: {
			'set-cookie': await getSessionStorage(env).commitSession(cookieSession, {
				expires: remember ? getSessionExpirationDate() : undefined,
			}),
		},
	});
}

export const meta: MetaFunction = () => {
	return [{ title: 'Setup John Wicki Account' }];
};

export default function Component({ actionData }: Route.ComponentProps) {
	let { form, fields } = useForm(SignupFormSchema, {
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
				<p className="text-muted-foreground">Please enter your details</p>
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
						Please enter an email
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
						autoComplete="username"
						className="peer pt-7 lowercase leading-5"
						defaultValue={fields.username.defaultValue}
						id={fields.username.id}
						name={fields.username.name}
						placeholder=""
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
						id={fields.email.descriptionId}
					>
						Please enter a username
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.username.errorId}
					>
						{fields.username.errors}
					</div>
				</div>
				<div className="relative">
					<Input
						aria-describedby={
							!fields.password.valid
								? fields.password.errorId
								: fields.password.descriptionId
						}
						aria-invalid={!fields.password.valid ? true : undefined}
						autoComplete="new-password"
						className="peer pt-7 leading-5"
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
						Password
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.password.descriptionId}
					>
						Please enter a password
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
						className="peer pt-7 leading-5"
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
						Confirm Password
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
				<div className="flex gap-x-3 py-0.5">
					<Checkbox
						aria-labelledby={
							fields.agreeToTermsOfServiceAndPrivacyPolicy.descriptionId
						}
						className="peer"
						defaultChecked={
							fields.agreeToTermsOfServiceAndPrivacyPolicy.defaultChecked
						}
						id={fields.agreeToTermsOfServiceAndPrivacyPolicy.id}
						name={fields.agreeToTermsOfServiceAndPrivacyPolicy.name}
					/>
					<Label
						className="self-center font-light text-gray-4 hover:text-foreground peer-hover:text-foreground"
						htmlFor={fields.agreeToTermsOfServiceAndPrivacyPolicy.id}
					>
						Do you agree to our Terms of Service and Privacy Policy?
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.agreeToTermsOfServiceAndPrivacyPolicy.descriptionId}
					>
						Please check if you agree to terms of service and privacy policy
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.agreeToTermsOfServiceAndPrivacyPolicy.errorId}
					>
						{fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
					</div>
				</div>
				<div className="flex gap-x-3 py-0.5">
					<Checkbox
						aria-labelledby={fields.remember.descriptionId}
						className="peer"
						defaultChecked={fields.remember.defaultChecked}
						id={fields.remember.id}
						name={fields.remember.name}
					/>
					<Label
						className="self-center font-light text-gray-4 hover:text-foreground peer-hover:text-foreground"
						htmlFor={fields.remember.id}
					>
						Remember me? (14 days)
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.remember.descriptionId}
					>
						Please check if you want your login to be remembered for 14 days
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
								to="/reset-password"
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
						Create an account
					</Button>
				</div>
			</Form>
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
		</div>
	);
}
