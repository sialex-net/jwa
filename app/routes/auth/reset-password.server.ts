import { invariant } from '@epic-web/invariant';
import { eq, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data, redirect } from 'react-router';
import { connectClientCf } from '@/app/middleware/libsql';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import { resetPasswordUsernameSessionKey } from './reset-password';
import type { VerifyFunctionArgs } from './verify.server';

export async function handleVerification(
	env: Env,
	{ request, result }: VerifyFunctionArgs,
) {
	invariant(result, 'result should be defined by now');
	let target = result.target;

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let user = await db
		.select({
			email: schema.users.email,
			username: schema.users.username,
		})
		.from(schema.users)
		.where(
			or(eq(schema.users.email, target), eq(schema.users.username, target)),
		)
		.get();
	if (!user) {
		return data(
			{
				result: {
					error: {
						fieldErrors: {
							code: ['Invalid code'],
						},
						formErrors: [],
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

	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	verifySession.set(resetPasswordUsernameSessionKey, user.username);
	return redirect('/reset-password', {
		headers: {
			'set-cookie':
				await getVerifySessionStorage(env).commitSession(verifySession),
		},
	});
}
