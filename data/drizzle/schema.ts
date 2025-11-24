import { createId } from '@paralleldrive/cuid2';
import { sql } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import * as t from 'drizzle-orm/sqlite-core';

let timestamps = {
	createdAt: t
		.integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: t
		.integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
};

let users = t.sqliteTable('users', {
	email: t.text('email').notNull().unique(),
	id: t
		.text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	username: t.text('username'),
	...timestamps,
});

let posts = t.sqliteTable('posts', {
	content: t.text('content'),
	id: t
		.text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	title: t.text('title').notNull().unique(),
	userId: t
		.text('user_id')
		.notNull()
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
	...timestamps,
});

let userImages = t.sqliteTable('user_images', {
	altText: t.text('alt_text'),
	blob: t.blob(),
	contentType: t.text('content_type'),
	id: t
		.text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: t
		.text('user_id')
		.references((): AnySQLiteColumn => users.id, { onDelete: 'cascade' }),
	...timestamps,
});

let postImages = t.sqliteTable('post_images', {
	altText: t.text('alt_text'),
	blob: t.blob(),
	contentType: t.text('content_type'),
	id: t
		.text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	postId: t
		.text('post_id')
		.references((): AnySQLiteColumn => posts.id, { onDelete: 'cascade' }),
	...timestamps,
});

export { postImages, posts, userImages, users };
