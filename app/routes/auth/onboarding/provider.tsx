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
import {
	getAuthenticator,
	sessionKey,
	signupWithConnection,
} from '@/app/utils/auth.server';
import { getSessionStorage } from '@/app/utils/sessions.server';
import { UsernameSchema } from '@/app/utils/user-validation';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/provider';
import { requireData } from './provider.server';

export const onboardingEmailSessionKey = 'onboardingEmail';
export const prefilledProfileKey = 'prefilledProfile';
export const providerIdKey = 'providerId';

const SignupFormSchema = z.object({
	agreeToTermsOfServiceAndPrivacyPolicy: z.preprocess(
		(v) => v === 'on',
		z.boolean({
			error: (issue) => {
				if (issue.input === undefined) {
					return 'You must agree to the terms of service and privacy policy';
				}
			},
		}),
	),
	imageUrl: z.string().optional(),
	redirectTo: z.string().optional(),
	remember: z.boolean().optional(),
	username: UsernameSchema,
});

export async function loader({ context, params, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);

	let { email } = await requireData(env, { params, request });
	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let prefilledProfile = verifySession.get(prefilledProfileKey);

	let formError = cookieSession.get(getAuthenticator(env).sessionErrorKey);

	return data(
		{
			email,
			result: {
				error: {
					fieldErrors: {},
					formErrors: typeof formError === 'string' ? [formError] : [],
				},
				submission: {
					fields: [],
					intent: null,
					payload: prefilledProfile ?? {},
				},
			},
		},
		{ status: 400 },
	);
}

export async function action({ context, params, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);

	let { email, providerId, providerName } = await requireData(env, {
		params,
		request,
	});
	let formData = await request.formData();
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);

	let submission = parseSubmission(formData);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = SignupFormSchema.superRefine(async (data, ctx) => {
		let existingUser = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(eq(schema.users.username, data.username))
			.get();
		if (existingUser) {
			ctx.addIssue({
				code: 'custom',
				message: 'A user already exists with this username',
				path: ['username'],
			});
			return;
		}
	}).transform(async (data) => {
		let session = await signupWithConnection({
			...data,
			email,
			providerId,
			providerName,
		});
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
				}),
			},
			{ status: 400 },
		);
	}

	let { session, remember, redirectTo } = result.data;

	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	cookieSession.set(sessionKey, session.id);
	let headers = new Headers();
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
	let [searchParams] = useSearchParams();
	let redirectTo = searchParams.get('redirectTo');

	let { fields, form } = useForm(SignupFormSchema, {
		id: 'signup-form',
		lastResult: actionData?.result ?? loaderData.result,
	});

	return (
		<div className="container flex min-h-full flex-col justify-center pt-20 pb-32">
			<div className="mx-auto w-full max-w-lg">
				<div className="flex flex-col gap-3 text-center">
					<h1 className="text-h1">Welcome aboard {loaderData.email}!</h1>
					<p className="text-body-md text-muted-foreground">
						Please enter your details.
					</p>
				</div>
				<Spacer size="xs" />
				<Form
					className="mx-auto min-w-[368px] max-w-sm"
					method="POST"
					{...form.props}
				>
					{fields.imageUrl.defaultValue ? (
						<div className="mb-4 flex flex-col items-center justify-center gap-4">
							<img
								alt="Profile"
								className="h-24 w-24 rounded-full"
								src={fields.imageUrl.defaultValue}
							/>
							<p className="text-body-sm text-muted-foreground">
								You can change your photo later
							</p>
							<input
								defaultValue={fields.imageUrl.defaultValue}
								id={fields.imageUrl.id}
								key={fields.imageUrl.key}
								name={fields.imageUrl.name}
								type="hidden"
							/>
						</div>
					) : null}
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

					{redirectTo ? (
						<input
							name="redirectTo"
							type="hidden"
							value={redirectTo}
						/>
					) : null}

					<ErrorList
						errors={form.errors}
						id={form.errorId}
					/>

					<div className="flex items-center justify-between gap-6">
						<Button
							className="w-full"
							type="submit"
						>
							Create an account
						</Button>
					</div>
				</Form>
			</div>
		</div>
	);
}
