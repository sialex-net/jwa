import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { MetaFunction } from 'react-router';
import { data, Form, redirect, useSearchParams } from 'react-router';
import { safeRedirect } from 'remix-utils/safe-redirect';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireAnonymous, sessionKey, signup } from '@/app/utils/auth.server';
import { getSessionStorage } from '@/app/utils/sessions.server';
import { PasswordSchema, UsernameSchema } from '@/app/utils/user-validation';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/onboarding';

export const onboardingEmailSessionKey = 'onboardingEmail';

const OnboardingFormSchema = z
	.object({
		agreeToTermsOfServiceAndPrivacyPolicy: z.preprocess(
			(v) => v === 'on',
			z.boolean(),
		),
		confirmPassword: PasswordSchema,
		password: PasswordSchema,
		redirectTo: z.string().optional(),
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

async function requireOnboardingEmail(env: Env, request: Request) {
	await requireAnonymous(env, request);
	const verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	const email = verifySession.get(onboardingEmailSessionKey);
	if (typeof email !== 'string' || !email) {
		throw redirect('/signup');
	}
	return email;
}

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let email = await requireOnboardingEmail(env, request);
	return { email };
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let email = await requireOnboardingEmail(env, request);
	let formData = await request.formData();
	let submission = parseSubmission(formData);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = OnboardingFormSchema.superRefine(async (data, ctx) => {
		let existingUsername = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.username, data.username))
			.get();

		if (existingUsername) {
			ctx.addIssue({
				code: 'custom',
				message: 'Username not available',
				path: ['username'],
			});
		}
	}).transform(async (data) => {
		let session = await signup({ ...data, email });
		return { ...data, session };
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

	let { session, remember, redirectTo } = result.data;

	const cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	cookieSession.set(sessionKey, session.id);
	const verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	const headers = new Headers();
	headers.append(
		'set-cookie',
		await getSessionStorage(env).commitSession(cookieSession, {
			expires: remember ? session.expirationDate : undefined,
		}),
	);
	headers.append(
		'set-cookie',
		await getVerifySessionStorage(env).destroySession(verifySession),
	);

	return redirect(safeRedirect(redirectTo), { headers });
}

export const meta: MetaFunction = () => {
	return [{ title: 'Setup Epic Notes Account' }];
};

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	let data = loaderData;
	let [searchParams] = useSearchParams();
	let redirectTo = searchParams.get('redirectTo');

	let { form, fields } = useForm(OnboardingFormSchema, {
		defaultValue: { redirectTo },
		id: 'onboarding-form',
		lastResult: actionData?.result,
	});

	return (
		<div className="container flex flex-col items-center">
			<header className="container flex flex-col items-center gap-3">
				<h1 className="text-h1">Welcome {data.email}!</h1>
				<p className="text-body-md text-muted-foreground">
					Please enter your details.
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
						id={fields.username.descriptionId}
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

				<input
					defaultValue={fields.redirectTo.defaultValue}
					id={fields.redirectTo.id}
					key={fields.redirectTo.key}
					name={fields.redirectTo.name}
					type="hidden"
				/>

				<ErrorList
					errors={form.errors}
					id={form.errorId}
				/>

				<div className="flex items-center justify-between gap-6">
					<Button
						aria-label="Create an account"
						className="w-full text-lg"
						size="default"
						type="submit"
					>
						Create an account
					</Button>
				</div>
			</Form>
		</div>
	);
}
