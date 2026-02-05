import { useRouteLoaderData } from 'react-router';
import type { loader as rootLoader } from '@/app/root.tsx';

export function useOptionalUser() {
	let data = useRouteLoaderData<typeof rootLoader>('root');
	return data?.user ?? null;
}

export function useUser() {
	let maybeUser = useOptionalUser();
	if (!maybeUser) {
		throw new Error(
			'No user found in root loader, but user is required by useUser. If user is optional, try useOptionalUser instead.',
		);
	}
	return maybeUser;
}

export function userHasPermission(
	user: null | Pick<ReturnType<typeof useUser>, 'roles'>,
	permission: PermissionString,
) {
	if (!user) return false;
	const { action, entity, access } = parsePermissionString(permission);
	return user.roles.some((role) =>
		role.permissions.some(
			(permission) =>
				permission.entity === entity &&
				permission.action === action &&
				(!access || access.includes(permission.access)),
		),
	);
}

export function userHasRole(
	user: null | Pick<ReturnType<typeof useUser>, 'roles'>,
	role: string,
) {
	if (!user) return false;
	return user.roles.some((r) => r.name === role);
}

type Action = 'create' | 'delete' | 'read' | 'update';
type Entity = 'note' | 'user';
type Access = 'any' | 'any,own' | 'own' | 'own,any';
export type PermissionString =
	| `${Action}:${Entity}:${Access}`
	| `${Action}:${Entity}`;

export function parsePermissionString(permissionString: PermissionString) {
	const [action, entity, access] = permissionString.split(':');
	return {
		access: access ? access.split(',') : undefined,
		action,
		entity,
	};
}
