import { invariant } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { redirect } from 'react-router';
import { safeRedirect } from 'remix-utils/safe-redirect';
import { connectClientCf } from '@/app/middleware/libsql';
import { sessionKey } from '@/app/utils/auth.server';
import { getSessionStorage } from '@/app/utils/sessions.server';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import { rememberKey, unverifiedSessionIdKey } from './login';
import type { VerifyFunctionArgs } from './verify.server';

export async function handleVerification(
	env: Env,
	{ request, result }: VerifyFunctionArgs,
) {
	invariant(result, 'Submission should have a value by this point');
	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });
	let session = await db
		.select({ expirationDate: schema.sessions.expirationDate })
		.from(schema.sessions)
		.where(eq(schema.sessions.id, verifySession.get(unverifiedSessionIdKey)))
		.get();
	if (!session) {
		throw redirect('/login');
	}

	cookieSession.set(sessionKey, verifySession.get(unverifiedSessionIdKey));

	let remember = verifySession.get(rememberKey);
	let { redirectTo } = result;

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
