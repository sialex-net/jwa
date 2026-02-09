import { compare, genSalt, hash } from 'bcrypt-ts/browser';
import { and, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { redirect } from 'react-router';
import { safeRedirect } from 'remix-utils/safe-redirect';
import z from 'zod';
import type { SelectPassword, SelectUser } from '@/data/drizzle/schema';
import * as schema from '@/data/drizzle/schema';
import { connectClientCf } from '../middleware/libsql';
import { combineResponseInits } from './http';
import { getSessionStorage } from './sessions.server';

const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 14;

let getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME);

export let sessionKey = 'sessionId';

export async function getUserId(env: Env, request: Request) {
	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let sessionId = cookieSession.get(sessionKey);
	if (!sessionId) return null;
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	let user = await db
		.select({ id: schema.users.id })
		.from(schema.sessions)
		.where(
			and(
				eq(schema.sessions.id, sessionId),
				gt(schema.sessions.expirationDate, new Date()),
			),
		)
		.innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
		.get();

	client.close();

	if (!user) {
		throw await logout({ env, request });
	}
	return user.id;
}

export async function requireUserId(
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
	let client = connectClientCf();
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
	let user = await verifyUserPassword({ email }, password);
	if (!user) return null;
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	let session = await db
		.insert(schema.sessions)
		.values({ expirationDate: getSessionExpirationDate(), userId: user.id })
		.returning({
			expirationDate: schema.sessions.expirationDate,
			id: schema.sessions.id,
		})
		.get();
	return session;
}

export async function signup({
	email,
	username,
	password,
}: {
	email: SelectUser['email'];
	password: string;
	username: SelectUser['username'];
}) {
	let hashedPassword = await getPasswordHash(password);
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	let user = await db
		.insert(schema.users)
		.values({ email: email.toLowerCase(), username: username.toLowerCase() })
		.returning({ id: schema.users.id })
		.get();
	await db
		.insert(schema.passwords)
		.values({ hash: hashedPassword, userId: user.id });
	let userRole = await db
		.select({ id: schema.roles.id })
		.from(schema.roles)
		.where(eq(schema.roles.name, 'user'))
		.get();
	if (userRole) {
		await db
			.insert(schema.usersToRoles)
			.values({ roleId: userRole.id, userId: user.id });
	}
	let session = await db
		.insert(schema.sessions)
		.values({ expirationDate: getSessionExpirationDate(), userId: user.id })
		.returning({
			expirationDate: schema.sessions.expirationDate,
			id: schema.sessions.id,
		})
		.get();
	return session;
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
	let sessionId = cookieSession.get(sessionKey);
	if (sessionId) {
		let client = connectClientCf();
		let db = drizzle(client, { logger: false, schema });
		void db
			.delete(schema.sessions)
			.where(eq(schema.sessions.id, sessionId))
			.catch(() => {});
	}
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

export async function getPasswordHash(password: string) {
	let salt = await genSalt(10);
	return await hash(password, salt);
}

export async function verifyUserPassword(
	where: Pick<SelectUser, 'email'> | Pick<SelectUser, 'id'>,
	password: SelectPassword['hash'],
) {
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	const WhereSchema = z.object({
		email: z.string().optional(),
		id: z.string().optional(),
	});

	let whereResult = WhereSchema.parse(where);

	let userWithPassword = whereResult.id
		? await db
				.select({
					hash: schema.passwords.hash,
					id: schema.users.id,
					username: schema.users.username,
				})
				.from(schema.users)
				.where(eq(schema.users.id, whereResult.id))
				.leftJoin(
					schema.passwords,
					eq(schema.users.id, schema.passwords.userId),
				)
				.get()
		: whereResult.email
			? await db
					.select({
						hash: schema.passwords.hash,
						id: schema.users.id,
						username: schema.users.username,
					})
					.from(schema.users)
					.where(eq(schema.users.email, whereResult.email))
					.leftJoin(
						schema.passwords,
						eq(schema.users.id, schema.passwords.userId),
					)
					.get()
			: undefined;

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
