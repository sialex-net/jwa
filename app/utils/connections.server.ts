import { createCookieSessionStorage } from 'react-router';
import type { ProviderName } from './connections';
import { GitHubProvider } from './providers/github.server';
import type { AuthProvider } from './providers/provider';

export function getConnectionSessionStorage(env: Env) {
	return createCookieSessionStorage({
		cookie: {
			httpOnly: true,
			maxAge: 60 * 10, // 10 minutes
			name: 'en_connection',
			path: '/',
			sameSite: 'lax',
			secrets: env.SESSION_SECRET.split(','),
			secure: env.APP_ENV === 'preview' || env.APP_ENV === 'production',
		},
	});
}

export let providers: Record<ProviderName, AuthProvider> = {
	github: new GitHubProvider(),
};

export function resolveConnectionData(
	providerName: ProviderName,
	providerId: string,
) {
	return providers[providerName].resolveConnectionData(providerId);
}
