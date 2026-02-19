import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { getAuthenticator, getUserId } from '@/app/utils/auth.server';
import { ProviderNameSchema, providerLabels } from '@/app/utils/connections';
import * as schema from '@/data/drizzle/schema';
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
		let consoleMsg = {
			description:
				existingConnection.userId === userId
					? `Your "${profile.username}" ${label} account is already connected.`
					: `The "${profile.username}" ${label} account is already connected to another account.`,
			title: 'Already Connected',
		};
		console.log(consoleMsg);
		throw redirect('/settings/connections');
	}

	throw redirect('/login');
}
