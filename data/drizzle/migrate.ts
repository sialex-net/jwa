import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { getClientNode } from '../clients/libsql-node';

async function main() {
	let client = getClientNode();
	let db = drizzle(client);

	await migrate(db, {
		migrationsFolder: './data/drizzle/migrations',
	});

	client.close();
}

main();
