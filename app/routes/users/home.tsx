import { drizzle } from 'drizzle-orm/libsql';
import { getClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/home';

export async function loader(_: Route.LoaderArgs) {
	let client = getClientCf();
	let db = drizzle(client, { logger: true, schema });

	let query = await db.select().from(schema.users);

	client.close();

	return {
		data: {
			query,
		},
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<h1>Users</h1>
			<ul>
				{loaderData.data.query.map((user) => (
					<li key={user.id}>{user.username}</li>
				))}
			</ul>
		</>
	);
}
