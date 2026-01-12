import { compare } from 'bcrypt-ts/browser';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import type { SelectPassword, SelectUser } from '@/data/drizzle/schema';
import * as schema from '@/data/drizzle/schema';
import { getClientCf } from '../middleware/libsql';

export async function login({
	email,
	password,
}: {
	email: SelectUser['email'];
	password: string;
}) {
	return verifyUserPassword(email, password);
}

async function verifyUserPassword(
	email: SelectUser['email'],
	password: SelectPassword['hash'],
) {
	let client = getClientCf();
	let db = drizzle(client, { logger: false, schema });
	let userWithPassword = await db
		.select({
			hash: schema.passwords.hash,
			id: schema.users.id,
			username: schema.users.username,
		})
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.leftJoin(schema.passwords, eq(schema.users.id, schema.passwords.userId))
		.get();

	client.close();

	if (!userWithPassword || !userWithPassword.hash) {
		return null;
	}

	let isValid = await compare(password, userWithPassword.hash);

	if (!isValid) {
		return null;
	}

	return {
		id: userWithPassword.id,
		username: userWithPassword.username,
	};
}
