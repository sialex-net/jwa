import { drizzle } from 'drizzle-orm/libsql';
import { execa } from 'execa';
import { getClientNode } from './clients/libsql-node';
import * as schema from './drizzle/schema';

/**
 * datasourceUrl
 *
 * for production database, SQL should be added to migrations
 * use `file:./data/tmp.sqlite3` then generate SQL with
 * `sqlite3 ./data/tmp.sqlite3 .dump > tmp.sql`
 *
 * use `http://127.0.0.1:8080` for inserting values directly, e.g.
 * into `data/local-db/*`
 * not suitable for production database
 */

const datasourceUrl = 'http://127.0.0.1:8080';

async function pushSchema() {
	try {
		let { stdout } = await execa({
			preferLocal: true,
		})`drizzle-kit push --dialect=turso --schema=./data/drizzle/schema.ts --url=${datasourceUrl}`;

		console.log(stdout);
	} catch (error) {
		// @ts-expect-error
		console.error('Error:', error.message);
	}
}

console.time('Pushed schema...');
await pushSchema();
console.timeEnd('Pushed schema...');

let client = getClientNode(datasourceUrl);
let db = drizzle(client, { schema });

console.time('Created roles...');
let adminRole = await db
	.insert(schema.roles)
	.values({
		name: 'admin',
	})
	.returning()
	.get();

let userRole = await db
	.insert(schema.roles)
	.values({
		name: 'user',
	})
	.returning()
	.get();
console.timeEnd('Created roles...');

console.time('Created permissions...');
const entities = ['user', 'note'];
const actions = ['create', 'read', 'update', 'delete'];
const accesses = ['own', 'any'];
for (let entity of entities) {
	for (let action of actions) {
		for (let access of accesses) {
			let result = await db
				.insert(schema.permissions)
				.values({ access, action, entity })
				.returning({
					access: schema.permissions.access,
					id: schema.permissions.id,
				})
				.get();
			if (result.access === 'any') {
				await db
					.insert(schema.rolesToPermissions)
					.values({ permissionId: result.id, roleId: adminRole.id });
			} else if (result.access === 'own') {
				await db
					.insert(schema.rolesToPermissions)
					.values({ permissionId: result.id, roleId: userRole.id });
			}
		}
	}
}
console.timeEnd('Created permissions...');
