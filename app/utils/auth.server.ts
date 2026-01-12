import { compare } from 'bcrypt-ts/browser';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { redirect } from 'react-router';
import { safeRedirect } from 'remix-utils/safe-redirect';
import type { SelectPassword, SelectUser } from '@/data/drizzle/schema';
import * as schema from '@/data/drizzle/schema';
import { getClientCf } from '../middleware/libsql';
import { combineResponseInits } from './http';
import { getSessionStorage } from './sessions.server';

const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 14;

export let getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME);

export let userIdKey = 'userId';

export async function getUserId(env: Env, request: Request) {
	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let userId = cookieSession.get(userIdKey);
	if (!userId) return null;
	let client = getClientCf();
	let db = drizzle(client, { logger: false, schema });
	let user = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.get();

	client.close();

	if (!user) {
		throw await logout({ env, request });
	}
	return user.id;
}

async function requireUserId(
	env: Env,
	request: Request,
	{ redirectTo }: { redirectTo?: null | string } = {},
) {
	let userId = await getUserId(env, request);
	if (!userId) {
		let requestUrl = new URL(request.url);
		redirectTo =
			redirectTo === null
				? null
				: (redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`);
		let loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null;
		let loginRedirect = ['/login', loginParams?.toString()]
			.filter(Boolean)
			.join('?');
		throw redirect(loginRedirect);
	}
	return userId;
}

export async function requireAnonymous(env: Env, request: Request) {
	let userId = await getUserId(env, request);
	if (userId) {
		throw redirect('/');
	}
}

export async function requireUser(env: Env, request: Request) {
	let userId = await requireUserId(env, request);
	let client = getClientCf();
	if (client.closed) {
		client.reconnect();
	}
	let db = drizzle(client, { logger: false, schema });
	let user = await db
		.select({ id: schema.users.id, username: schema.users.username })
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.get();

	client.close();

	if (!user) {
		throw await logout({ env, request });
	}
	return user;
}

export async function login({
	email,
	password,
}: {
	email: SelectUser['email'];
	password: string;
}) {
	return verifyUserPassword(email, password);
}

export async function logout(
	{
		env,
		redirectTo = '/',
		request,
	}: {
		env: Env;
		redirectTo?: string;
		request: Request;
	},
	responseInit?: ResponseInit,
) {
	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	throw redirect(
		safeRedirect(redirectTo),
		combineResponseInits(responseInit, {
			headers: {
				'set-cookie':
					await getSessionStorage(env).destroySession(cookieSession),
			},
		}),
	);
}

async function verifyUserPassword(
	email: SelectUser['email'],
	password: SelectPassword['hash'],
) {
	let client = getClientCf();
	let db = drizzle(client, { logger: false, schema });
	let userWithPassword = await db
		.select({
			hash: schema.passwords.hash,
			id: schema.users.id,
			username: schema.users.username,
		})
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.leftJoin(schema.passwords, eq(schema.users.id, schema.passwords.userId))
		.get();

	client.close();

	if (!userWithPassword || !userWithPassword.hash) {
		return null;
	}

	let isValid = await compare(password, userWithPassword.hash);

	if (!isValid) {
		return null;
	}

	return {
		id: userWithPassword.id,
		username: userWithPassword.username,
	};
}
