import { drizzle } from 'drizzle-orm/libsql';
import { Link } from 'react-router';
import { appContext } from '@/app/context';
import { getClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/home';

export async function loader({ context, request }: Route.LoaderArgs) {
	let appEnv = context.get(appContext).env.APP_ENV;
	let tursoUrl = context.get(appContext).env.TURSO_URL;
	let url = new URL(request.url);

	let client = getClientCf();
	let db = drizzle(client, { logger: true, schema });

	let query = await db.select().from(schema.users);

	client.close();

	return {
		data: {
			appEnv,
			hostname: url.hostname,
			query,
			tursoUrl,
		},
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<h1>Users</h1>
			<ul>
				{loaderData.data.query.map((user) => (
					<li key={user.id}>
						<Link to={`/users/${user.username}`}>
							{user.username ?? user.email}
						</Link>
					</li>
				))}
			</ul>
			{loaderData.data.hostname === 'localhost' && (
				<div>
					<p>APP_ENV={loaderData.data.appEnv}</p>
					<p>TURSO_URL={loaderData.data.tursoUrl}</p>
				</div>
			)}
		</>
	);
}
