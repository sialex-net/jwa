import { sql } from 'drizzle-orm';
import { customType, integer, text } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

let id = text('id', { mode: 'text' })
	.primaryKey()
	.notNull()
	.$defaultFn(() => nanoid());

let timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
};

let blobAsArrayBuffer = customType<{
	data: ArrayBuffer;
}>({
	dataType() {
		return 'blob';
	},
});

export { blobAsArrayBuffer, id, timestamps };
