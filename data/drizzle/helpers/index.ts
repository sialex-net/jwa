import { text } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

export let id = text('id', { mode: 'text' })
	.primaryKey()
	.notNull()
	.$defaultFn(() => nanoid());
