import { type Client, createClient } from '@libsql/client';

let client: Client;

export function getClientCf(env: Env) {
	let { APP_ENV, LOCAL_TURSO_URL, TURSO_AUTH_TOKEN, TURSO_URL } = env;

	if (!client || client.closed) {
		client = createClient({
			authToken: APP_ENV === 'development' ? undefined : TURSO_AUTH_TOKEN,
			url: APP_ENV === 'development' ? LOCAL_TURSO_URL : TURSO_URL,
		});
	}

	return client;
}
