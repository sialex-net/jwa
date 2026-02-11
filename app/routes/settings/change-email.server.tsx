import { invariant } from '@epic-web/invariant';
import * as ReactEmail from '@react-email/components';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data, redirect } from 'react-router';
import { connectClientCf } from '@/app/middleware/libsql';
import type { VerifyFunctionArgs } from '@/app/routes/auth/verify.server';
import { sendEmail } from '@/app/utils/email.server';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import { newEmailAddressSessionKey } from './change-email';

export async function handleVerification(
	env: Env,
	{ request, result }: VerifyFunctionArgs,
) {
	invariant(result, 'submission.value should be defined by now');

	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let newEmail = verifySession.get(newEmailAddressSessionKey);
	if (!newEmail) {
		data(
			{
				result: {
					error: {
						fieldErrors: {},
						formErrors: [
							'You must submit the code on the same device that requested the email change.',
						],
					},
					submission: {
						fields: [],
						intent: null,
						payload: {},
					},
				},
			},
			{ status: 400 },
		);
	}
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let preUpdateUser = await db
		.select({ email: schema.users.email })
		.from(schema.users)
		.where(eq(schema.users.id, result.target))
		.get();
	invariant(preUpdateUser, 'preUpdateUser should be defined');

	let user = await db
		.update(schema.users)
		.set({ email: newEmail })
		.where(eq(schema.users.id, result.target))
		.returning({
			email: schema.users.email,
			id: schema.users.id,
			username: schema.users.username,
		})
		.get();

	void sendEmail(env, {
		react: <EmailChangeNoticeEmail userId={user.id} />,
		subject: 'Epic Stack email changed',
		to: preUpdateUser.email,
	});

	throw redirect('/settings', {
		headers: {
			'set-cookie':
				await getVerifySessionStorage(env).destroySession(verifySession),
		},
	});
}

export function EmailChangeEmail({
	verifyUrl,
	otp,
}: {
	otp: string;
	verifyUrl: string;
}) {
	return (
		<ReactEmail.Html
			dir="ltr"
			lang="en"
		>
			<ReactEmail.Container>
				<h1>
					<ReactEmail.Text>Epic Notes Email Change</ReactEmail.Text>
				</h1>
				<p>
					<ReactEmail.Text>
						Here's your verification code: <strong>{otp}</strong>
					</ReactEmail.Text>
				</p>
				<p>
					<ReactEmail.Text>Or click the link:</ReactEmail.Text>
				</p>
				<ReactEmail.Link href={verifyUrl}>{verifyUrl}</ReactEmail.Link>
			</ReactEmail.Container>
		</ReactEmail.Html>
	);
}

export function EmailChangeNoticeEmail({ userId }: { userId: string }) {
	return (
		<ReactEmail.Html
			dir="ltr"
			lang="en"
		>
			<ReactEmail.Container>
				<h1>
					<ReactEmail.Text>
						Your Epic Notes email has been changed
					</ReactEmail.Text>
				</h1>
				<p>
					<ReactEmail.Text>
						We're writing to let you know that your Epic Notes email has been
						changed.
					</ReactEmail.Text>
				</p>
				<p>
					<ReactEmail.Text>
						If you changed your email address, then you can safely ignore this.
						But if you did not change your email address, then please contact
						support immediately.
					</ReactEmail.Text>
				</p>
				<p>
					<ReactEmail.Text>Your Account ID: {userId}</ReactEmail.Text>
				</p>
			</ReactEmail.Container>
		</ReactEmail.Html>
	);
}
