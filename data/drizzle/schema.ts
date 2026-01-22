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
	title: t.text('title').notNull().unique(),
	userId: t
		.text('user_id')
		.notNull()
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
	...timestamps,
});

let userImages = t.sqliteTable('user_images', {
	altText: t.text('alt_text').notNull(),
	blob: blobAsArrayBuffer('blob'),
	contentType: t.text('content_type'),
	id,
	userId: t
		.text('user_id')
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
		.references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
	...timestamps,
});

let passwords = t.sqliteTable('passwords', {
	hash: t.text('hash').notNull(),
	userId: t
		.text('user_id')
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
});

type SelectUser = typeof users.$inferSelect;

type SelectPassword = typeof passwords.$inferSelect;

export type { SelectPassword, SelectUser };

export { passwords, postImages, posts, userImages, users };
