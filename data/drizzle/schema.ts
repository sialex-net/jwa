import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import * as t from 'drizzle-orm/sqlite-core';
import { blobAsArrayBuffer, id, timestamps } from './helpers';

let users = t.sqliteTable('users', {
	email: t.text('email').notNull().unique(),
	id,
	username: t.text('username').notNull().unique(),
	...timestamps,
});

let posts = t.sqliteTable('posts', {
	content: t.text('content'),
	id,
	title: t.text('title').notNull(),
	userId: t
		.text('user_id')
		.notNull()
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
	...timestamps,
});

let userAvatar = t.sqliteTable('user_avatar', {
	altText: t.text('alt_text').notNull(),
	blob: blobAsArrayBuffer('blob'),
	contentType: t.text('content_type'),
	id,
	userId: t
		.text('user_id')
		.notNull()
		.unique()
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
	...timestamps,
});

let postImages = t.sqliteTable('post_images', {
	altText: t.text('alt_text'),
	blob: blobAsArrayBuffer('blob'),
	contentType: t.text('content_type'),
	id,
	postId: t
		.text('post_id')
		.notNull()
		.references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
	...timestamps,
});

let passwords = t.sqliteTable('passwords', {
	hash: t.text('hash').notNull().unique(),
	userId: t
		.text('user_id')
		.notNull()
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
});

let roles = t.sqliteTable('roles', {
	description: t.text('description').default(''),
	id,
	name: t.text('name').notNull().unique(),
	...timestamps,
});

let permissions = t.sqliteTable(
	'permissions',
	{
		access: t.text('access').notNull(),
		action: t.text('action').notNull(),
		description: t.text('description').default(''),
		entity: t.text('entity').notNull(),
		id,
		...timestamps,
	},
	(table) => [t.unique().on(table.access, table.action, table.entity)],
);

let usersToRoles = t.sqliteTable(
	'users_to_roles',
	{
		roleId: t
			.text('role_id')
			.notNull()
			.references(() => roles.id),
		userId: t
			.text('user_id')
			.notNull()
			.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
	},
	(table) => [t.primaryKey({ columns: [table.userId, table.roleId] })],
);

let rolesToPermissions = t.sqliteTable(
	'roles_to_permissions',
	{
		permissionId: t
			.text('permission_id')
			.notNull()
			.references(() => permissions.id),
		roleId: t
			.text('role_id')
			.notNull()
			.references((): AnySQLiteColumn => roles.id),
	},
	(table) => [t.primaryKey({ columns: [table.roleId, table.permissionId] })],
);

let sessions = t.sqliteTable('sessions', {
	expirationDate: t
		.integer('expiration_date', { mode: 'timestamp_ms' })
		.notNull(),
	id,
	userId: t
		.text('user_id')
		.notNull()
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
	...timestamps,
});

type SelectUser = typeof users.$inferSelect;

type SelectPassword = typeof passwords.$inferSelect;

export type { SelectPassword, SelectUser };

export {
	passwords,
	permissions,
	postImages,
	posts,
	roles,
	rolesToPermissions,
	sessions,
	userAvatar,
	users,
	usersToRoles,
};
