import { drizzle } from 'drizzle-orm/libsql';
import { Link } from 'react-router';
import { appContext } from '@/app/context';
import { getClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/home';

export async function loader({ context, request }: Route.LoaderArgs) {
	let appEnv = context.get(appContext).env.APP_ENV;
	let tursoUrl = context.get(appContext).env.TURSO_URL;
	let url = new URL(request.url);

	let client = getClientCf();
	let db = drizzle(client, { logger: false, schema });

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
			<main>
				<ul>
					{loaderData.data.query.map((user) => (
						<li key={user.id}>
							<Link to={`/users/${user.username}`}>{user.username}</Link>
						</li>
					))}
				</ul>
			</main>
			{loaderData.data.hostname === 'localhost' && (
				<div>
					<p>APP_ENV={loaderData.data.appEnv}</p>
					<p>TURSO_URL={loaderData.data.tursoUrl}</p>
				</div>
			)}
		</>
	);
}

export const meta: Route.MetaFunction = () => {
	return [
		{ title: 'Users' },
		{
			content: 'Users',
			name: 'description',
		},
	];
};
