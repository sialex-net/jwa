import type { Client } from '@libsql/client';
import { createClient } from '@libsql/client';
import { TURSO_AUTH_TOKEN, TURSO_URL } from '../../config/process-env';

let client: Client;

export function getClientNode() {
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
