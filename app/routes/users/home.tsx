import { drizzle } from 'drizzle-orm/libsql';
import { Link } from 'react-router';
import { appContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/home';

export async function loader({ context, request }: Route.LoaderArgs) {
	let appEnv = context.get(appContext).env.APP_ENV;
	let tursoUrl = context.get(appContext).env.TURSO_URL;
	let url = new URL(request.url);

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let query = await db
		.select({ users: { username: schema.users.username } })
		.from(schema.users);

	client.close();

	return {
		appEnv,
		hostname: url.hostname,
		tursoUrl,
		users: query.length ? query.map((item) => item.users) : [],
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<h1>Users</h1>
			<main>
				{loaderData.users.length ? (
					<ul>
						{loaderData.users.map((user) => (
							<li key={user.username}>
								<Link to={`/users/${user.username}`}>{user.username}</Link>
							</li>
						))}
					</ul>
				) : (
					<p>No users found</p>
				)}
			</main>
			{loaderData.hostname === 'localhost' && (
				<div>
					<p>APP_ENV={loaderData.appEnv}</p>
					<p>TURSO_URL={loaderData.tursoUrl}</p>
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
