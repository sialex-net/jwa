import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { getClient } from '../libsql-client';

async function main() {
	let client = getClient();
	let db = drizzle(client);

	await migrate(db, {
		migrationsFolder: './data/drizzle/migrations',
	});

	client.close();
}

main();
