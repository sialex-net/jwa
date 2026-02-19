import { invariant } from '@epic-web/invariant';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { redirect } from 'react-router';
import { safeRedirect } from 'remix-utils/safe-redirect';
import { connectClientCf } from '@/app/middleware/libsql';
import { sessionKey } from '@/app/utils/auth.server';
import { getSessionStorage } from '@/app/utils/sessions.server';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import { twoFAVerificationType } from '../settings/two-factor/two-factor';
import { rememberKey, unverifiedSessionIdKey, verifiedTimeKey } from './login';
import type { VerifyFunctionArgs } from './verify.server';
import { getRedirectToUrl } from './verify.server';

export async function handleNewSession(
	env: Env,
	{
		request,
		session,
		redirectTo,
		remember = false,
	}: {
		redirectTo?: string;
		remember?: boolean;
		request: Request;
		session: { expirationDate: Date; id: string; userId: string };
	},
) {
	if (await shouldRequestTwoFA(env, { request, userId: session.userId })) {
		let verifySession = await getVerifySessionStorage(env).getSession();
		verifySession.set(unverifiedSessionIdKey, session.id);
		verifySession.set(rememberKey, remember);
		let redirectUrl = getRedirectToUrl({
			request,
			target: session.userId,
			type: twoFAVerificationType,
		});
		return redirect(redirectUrl.toString(), {
			headers: {
				'set-cookie':
					await getVerifySessionStorage(env).commitSession(verifySession),
			},
		});
	} else {
		let cookieSession = await getSessionStorage(env).getSession(
			request.headers.get('cookie'),
		);
		cookieSession.set(sessionKey, session.id);

		return redirect(safeRedirect(redirectTo), {
			headers: {
				'set-cookie': await getSessionStorage(env).commitSession(
					cookieSession,
					{
						expires: remember ? session.expirationDate : undefined,
					},
				),
			},
		});
	}
}

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

	let remember = verifySession.get(rememberKey);
	let { redirectTo } = result;

	let headers = new Headers();
	cookieSession.set(verifiedTimeKey, Date.now());

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });
	let unverifiedSessionId = verifySession.get(unverifiedSessionIdKey);
	if (unverifiedSessionId) {
		let session = await db
			.select({ expirationDate: schema.sessions.expirationDate })
			.from(schema.sessions)
			.where(eq(schema.sessions.id, unverifiedSessionId))
			.get();
		if (!session) {
			throw redirect('/login');
		}
		cookieSession.set(sessionKey, unverifiedSessionId);

		headers.append(
			'set-cookie',
			await getSessionStorage(env).commitSession(cookieSession, {
				expires: remember ? session.expirationDate : undefined,
			}),
		);
	} else {
		headers.append(
			'set-cookie',
			await getSessionStorage(env).commitSession(cookieSession),
		);
	}

	headers.append(
		'set-cookie',
		await getVerifySessionStorage(env).destroySession(verifySession),
	);

	cookieSession.set(sessionKey, verifySession.get(unverifiedSessionIdKey));

	return redirect(safeRedirect(redirectTo), { headers });
}

export async function shouldRequestTwoFA(
	env: Env,
	{
		request,
		userId,
	}: {
		request: Request;
		userId: string;
	},
) {
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	if (verifySession.has(unverifiedSessionIdKey)) return true;
	// if it's over two hours since they last verified, we should request 2FA again
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let userHasTwoFA = await db
		.select({ id: schema.verifications.id })
		.from(schema.verifications)
		.where(
			and(
				eq(schema.verifications.target, userId),
				eq(schema.verifications.type, twoFAVerificationType),
			),
		)
		.get();
	if (!userHasTwoFA) return false;
	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let verifiedTime = cookieSession.get(verifiedTimeKey) ?? new Date(0);
	const twoHours = 1000 * 60 * 60 * 2;
	return Date.now() - verifiedTime > twoHours;
}
