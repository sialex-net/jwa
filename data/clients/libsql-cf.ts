import { type Client, createClient } from '@libsql/client';

let client: Client;

export function getClientCf(env: Env) {
	let { TURSO_AUTH_TOKEN, TURSO_URL } = env;

	if (!client || client.closed) {
		client = createClient({
			authToken: TURSO_AUTH_TOKEN === '' ? undefined : TURSO_AUTH_TOKEN,
			url: TURSO_URL,
		});
	}

	return client;
}
