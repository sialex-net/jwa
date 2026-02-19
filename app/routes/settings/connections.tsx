import { invariantResponse } from '@epic-web/invariant';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, useFetcher } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import { ProviderNameSchema } from '@/app/utils/connections';
import { resolveConnectionData } from '@/app/utils/connections.server';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/connections';

export const handle = {
	breadcrumb: <Icon name="link-2">Connections</Icon>,
};

async function userCanDeleteConnections(userId: string) {
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let query = await db
		.select({
			connections: { id: schema.connections.id },
			passwords: { userId: schema.passwords.userId },
			users: {
				id: schema.users.id,
			},
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.leftJoin(
			schema.connections,
			eq(schema.users.id, schema.connections.userId),
		)
		.leftJoin(schema.passwords, eq(schema.users.id, schema.passwords.userId));
	// user can delete their connections if they have a password
	if (query[0].passwords) return true;
	// users have to have more than one remaining connection to delete one
	return Boolean(query.length);
}

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let rawConnections = await db
		.select()
		.from(schema.connections)
		.where(eq(schema.connections.userId, userId));
	let connections: Array<{
		createdAtFormatted: string;
		displayName: string;
		id: string;
		link?: null | string;
	}> = [];
	for (let connection of rawConnections) {
		let r = ProviderNameSchema.safeParse(connection.providerName);
		if (!r.success) continue;
		let connectionData = await resolveConnectionData(
			env,
			r.data,
			connection.providerId,
		);
		if (connectionData) {
			connections.push({
				...connectionData,
				createdAtFormatted: connection.createdAt.toLocaleString(),
				id: connection.id,
			});
		} else {
			connections.push({
				createdAtFormatted: connection.createdAt.toLocaleString(),
				displayName: 'Unknown',
				id: connection.id,
			});
		}
	}

	return {
		canDeleteConnections: await userCanDeleteConnections(userId),
		connections,
	};
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let formData = await request.formData();
	invariantResponse(
		formData.get('intent') === 'delete-connection',
		'Invalid intent',
	);
	invariantResponse(
		await userCanDeleteConnections(userId),
		'You cannot delete your last connection unless you have a password.',
	);
	let connectionId = formData.get('connectionId');
	invariantResponse(typeof connectionId === 'string', 'Invalid connectionId');
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	await db
		.delete(schema.connections)
		.where(
			and(
				eq(schema.connections.id, connectionId),
				eq(schema.connections.userId, userId),
			),
		);
	return { status: 'success' } as const;
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<div className="mx-auto max-w-md">
			{loaderData.connections.length ? (
				<div className="flex flex-col gap-2">
					<p>Here are your current connections:</p>
					<ul className="flex flex-col gap-4">
						{loaderData.connections.map((c) => (
							<li key={c.id}>
								<Connection
									canDelete={loaderData.canDeleteConnections}
									connection={c}
								/>
							</li>
						))}
					</ul>
				</div>
			) : (
				<p>You don't have any connections yet.</p>
			)}
			<Form
				action="/auth/github"
				className="mt-5 flex items-center justify-center gap-2 border-border border-t-2 pt-3"
				method="POST"
			>
				<Button
					className="w-full"
					type="submit"
				>
					<Icon name="github-logo">Connect with GitHub</Icon>
				</Button>
			</Form>
		</div>
	);
}

function Connection({
	connection,
	canDelete,
}: {
	canDelete: boolean;
	connection: Route.ComponentProps['loaderData']['connections'][number];
}) {
	let deleteFetcher = useFetcher<typeof action>();
	return (
		<div className="flex justify-between gap-2">
			<Icon name="github-logo">
				{connection.link ? (
					<a
						className="underline"
						href={connection.link}
					>
						{connection.displayName}
					</a>
				) : (
					connection.displayName
				)}{' '}
				({connection.createdAtFormatted})
			</Icon>
			{canDelete ? (
				<deleteFetcher.Form method="POST">
					<input
						name="connectionId"
						type="hidden"
						value={connection.id}
					/>
					<Button
						name="intent"
						size="sm"
						value="delete-connection"
						variant="destructive"
					>
						<Icon name="cross-1" />
					</Button>
				</deleteFetcher.Form>
			) : (
				<Icon name="question-mark-circled">
					You cannot delete your last connection unless you have a password.
				</Icon>
			)}
		</div>
	);
}
