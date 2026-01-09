import { createCookieSessionStorage } from 'react-router';

export function getSessionStorage(env: Env) {
	return createCookieSessionStorage({
		cookie: {
			httpOnly: true,
			name: 'en_session',
			path: '/',
			sameSite: 'lax',
			secrets: env.SESSION_SECRET.split(','),
			secure: env.APP_ENV === 'preview' || env.APP_ENV === 'production',
		},
	});
}
