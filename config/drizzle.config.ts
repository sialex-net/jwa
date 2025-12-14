import { argv } from 'node:process';
import { defineConfig } from 'drizzle-kit';
import { TURSO_AUTH_TOKEN, TURSO_URL } from './process-env';

const authToken = TURSO_AUTH_TOKEN === '' ? undefined : TURSO_AUTH_TOKEN;
const url = TURSO_URL;

// log drizzle kit studio connection
if (argv.includes('studio')) {
	console.log('Connecting to database at...');
	console.log(url);
}

export default defineConfig({
	dbCredentials: {
		authToken,
		url,
	},
	dialect: 'turso',
	out: './data/drizzle/migrations',
	schema: './data/drizzle/schema.ts',
	strict: true,
	verbose: true,
});
