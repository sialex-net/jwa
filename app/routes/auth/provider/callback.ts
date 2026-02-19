import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import {
	getAuthenticator,
	getSessionExpirationDate,
	getUserId,
} from '@/app/utils/auth.server';
import { ProviderNameSchema, providerLabels } from '@/app/utils/connections';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import { handleNewSession } from '../login.server';
import {
	onboardingEmailSessionKey,
	prefilledProfileKey,
	providerIdKey,
} from '../onboarding/provider';
import type { Route } from './+types/callback';

export async function loader({ context, params, request }: Route.LoaderArgs) {
	let providerName = ProviderNameSchema.parse(params.provider);

	let label = providerLabels[providerName];

	let { env } = getContext(context, appContext);

	let profile = await getAuthenticator(env)
		.authenticate(providerName, request, { throwOnError: true })
		.catch(async (error) => {
			console.error(error);
			throw redirect('/login');
		});

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let existingConnection = await db
		.select({ userId: schema.connections.userId })
		.from(schema.connections)
		.where(
			and(
				eq(schema.connections.providerId, profile.id),
				eq(schema.connections.providerName, providerName),
			),
		)
		.get();

	let userId = await getUserId(env, request);

	if (existingConnection && userId) {
		let connections = {
			description:
				existingConnection.userId === userId
					? `Your "${profile.username}" ${label} account is already connected.`
					: `The "${profile.username}" ${label} account is already connected to another account.`,
			title: 'Already Connected',
		};
		console.log(connections);
		throw redirect('/settings/connections');
	}

	// If we're already logged in, then link the account
	if (userId) {
		if (client.closed) {
			client.reconnect();
		}
		await db.insert(schema.connections).values({
			providerId: profile.id,
			providerName,
			userId,
		});
		let consoleMsg = {
			description: `Your "${profile.username}" ${label} account has been connected.`,
			title: 'Connected',
			type: 'success',
		};
		console.log(consoleMsg);
		throw redirect('/settings/connections');
	}

	// Connection exists already? Make a new session
	if (existingConnection) {
		return makeSession(env, { request, userId: existingConnection.userId });
	}

	// if the email matches a user in the db, then link the account and
	// make a new session
	let user = await db
		.select({
			id: schema.users.id,
		})
		.from(schema.users)
		.where(eq(schema.users.email, profile.email.toLowerCase()))
		.get();

	if (user) {
		await db.insert(schema.connections).values({
			providerId: profile.id,
			providerName,
			userId: user.id,
		});
		return makeSession(env, {
			// send them to the connections page to see their new connection
			redirectTo: '/settings/connections',
			request,
			userId: user.id,
		});
	}

	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	verifySession.set(onboardingEmailSessionKey, profile.email);
	verifySession.set(prefilledProfileKey, {
		...profile,
		username: profile.username
			?.replace(/[^a-zA-Z0-9_]/g, '_')
			.toLowerCase()
			.slice(0, 20)
			.padEnd(3, '_'),
	});
	verifySession.set(providerIdKey, profile.id);
	return redirect(`/onboarding/${providerName}`, {
		headers: {
			'set-cookie':
				await getVerifySessionStorage(env).commitSession(verifySession),
		},
	});
}

async function makeSession(
	env: Env,
	{
		request,
		userId,
		redirectTo,
	}: { redirectTo?: null | string; request: Request; userId: string },
	responseInit?: ResponseInit,
) {
	redirectTo ??= '/';
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });
	let session = await db
		.insert(schema.sessions)
		.values({
			expirationDate: getSessionExpirationDate(),
			userId,
		})
		.returning({
			expirationDate: schema.sessions.expirationDate,
			id: schema.sessions.id,
			userId: schema.sessions.userId,
		})
		.get();
	return handleNewSession(
		env,
		{ redirectTo, remember: true, request, session },
		responseInit,
	);
}
