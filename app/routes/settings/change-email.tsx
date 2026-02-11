import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data, Form, redirect } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { prepareVerification } from '@/app/routes/auth/verify.server';
import { requireUserId } from '@/app/utils/auth.server';
import { sendEmail } from '@/app/utils/email.server';
import { EmailSchema } from '@/app/utils/user-validation';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/change-email';
import { EmailChangeEmail } from './change-email.server';

export const handle = {
	breadcrumb: <Icon name="envelope-closed">Change Email</Icon>,
};

export const newEmailAddressSessionKey = 'new-email-address';

const ChangeEmailSchema = z.object({
	email: EmailSchema,
});

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let user = await db
		.select({ email: schema.users.email })
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.get();

	if (!user) {
		const params = new URLSearchParams({ redirectTo: request.url });
		throw redirect(`/login?${params}`);
	}
	return { user };
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let formData = await request.formData();
	let submission = parseSubmission(formData);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = ChangeEmailSchema.superRefine(async (data, ctx) => {
		let existingUser = await db
			.select({ email: schema.users.email })
			.from(schema.users)
			.where(eq(schema.users.email, data.email))
			.get();
		if (existingUser) {
			ctx.addIssue({
				code: 'custom',
				message: 'This email is already in use.',
				path: ['email'],
			});
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

	let { otp, redirectTo, verifyUrl } = await prepareVerification({
		period: 10 * 60,
		request,
		target: userId,
		type: 'change-email',
	});

	let response = await sendEmail(env, {
		react: (
			<EmailChangeEmail
				otp={otp}
				verifyUrl={verifyUrl.toString()}
			/>
		),
		subject: `Epic Notes Email Change Verification`,
		to: result.data.email,
	});

	if (response.status === 'success') {
		let verifySession = await getVerifySessionStorage(env).getSession(
			request.headers.get('cookie'),
		);
		verifySession.set(newEmailAddressSessionKey, result.data.email);
		return redirect(redirectTo.toString(), {
			headers: {
				'set-cookie':
					await getVerifySessionStorage(env).commitSession(verifySession),
			},
		});
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

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	let data = loaderData;
	let { form, fields } = useForm(ChangeEmailSchema, {
		id: 'change-email-form',
		lastResult: actionData?.result,
	});

	return (
		<div className="container flex flex-col items-center">
			<header className="container flex flex-col items-center gap-3">
				<h1 className="text-2xl">Change Email</h1>
				<p>You will receive an email at the new email address to confirm.</p>
				<p>
					An email notice will also be sent to your old address:{' '}
					{data.user.email}.
				</p>
			</header>
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
						New Email
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.email.descriptionId}
					>
						Please enter your new email
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.email.errorId}
					>
						{fields.email.errors}
					</div>
				</div>
				<ErrorList
					errors={form.errors}
					id={form.errorId}
				/>
				<div>
					<Button
						className="w-full"
						type="submit"
					>
						Send Confirmation
					</Button>
				</div>
			</Form>
		</div>
	);
}
