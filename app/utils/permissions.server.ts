import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data } from 'react-router';
import * as schema from '@/data/drizzle/schema';
import { connectClientCf } from '../middleware/libsql';
import { requireUserId } from './auth.server';
import type { PermissionString } from './user';
import { parsePermissionString } from './user';

export async function requireUserWithPermission(
	env: Env,
	request: Request,
	permission: PermissionString,
) {
	let userId = await requireUserId(env, request);
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	let permissionData = parsePermissionString(permission);

	let query = await db
		.select({
			permissions: {
				access: schema.permissions.access,
				action: schema.permissions.action,
				entity: schema.permissions.entity,
			},
			users: { id: schema.users.id },
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.innerJoin(
			schema.usersToRoles,
			eq(schema.users.id, schema.usersToRoles.userId),
		)
		.innerJoin(
			schema.rolesToPermissions,
			eq(schema.usersToRoles.roleId, schema.rolesToPermissions.roleId),
		)
		.innerJoin(
			schema.permissions,
			eq(schema.rolesToPermissions.permissionId, schema.permissions.id),
		);

	let permissions = query
		.map((item) => item.permissions)
		.filter((item) => {
			let accessResult = permissionData.access?.filter(
				(i) => i === item.access,
			);
			return accessResult?.length ? accessResult : undefined;
		})
		.filter((item) => item.action === permissionData.action)
		.filter((item) => item.entity === permissionData.entity);

	if (!permissions.length) {
		throw data(
			import.meta.env.DEV
				? {
						error: 'Forbidden',
						message: `Forbidden: required permissions: ${permission}`,
						requiredPermission: permissionData,
					}
				: null,
			{
				status: 403,
				statusText: 'Forbidden',
			},
		);
	}
	return query[0].users.id;
}

export async function requireUserWithRole(
	env: Env,
	request: Request,
	name: string,
) {
	let userId = await requireUserId(env, request);
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });
	let query = await db
		.select({
			roles: { name: schema.roles.name },
			users: { id: schema.users.id },
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.innerJoin(
			schema.usersToRoles,
			eq(schema.users.id, schema.usersToRoles.userId),
		)
		.innerJoin(schema.roles, eq(schema.usersToRoles.roleId, schema.roles.id));
	let hasRole = query.some((item) => item.roles.name === name);

	if (!hasRole) {
		throw data(
			import.meta.env.DEV
				? {
						error: 'Forbidden',
						message: `Forbidden: required role: ${name}`,
						requiredRole: name,
					}
				: null,
			{
				status: 403,
				statusText: 'Forbidden',
			},
		);
	}
	return query[0].users.id;
}
