import type { Client } from '@libsql/client';
import { createClient } from '@libsql/client';

let client: Client;

export function getClientCf(env: Env) {
	let { TURSO_AUTH_TOKEN, TURSO_URL } = env;

	if (!client) {
		client = createClient({
			authToken: TURSO_AUTH_TOKEN === '' ? undefined : TURSO_AUTH_TOKEN,
			url: TURSO_URL,
		});
	}

	if (client?.closed) {
		client.reconnect();
	}

	return client;
}
