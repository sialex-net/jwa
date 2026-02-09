import { createCookieSessionStorage } from 'react-router';

export function getVerifySessionStorage(env: Env) {
	return createCookieSessionStorage({
		cookie: {
			httpOnly: true,
			maxAge: 60 * 10, // 10 minutes
			name: 'en_verification',
			path: '/',
			sameSite: 'lax',
			secrets: env.SESSION_SECRET.split(','),
			secure: env.APP_ENV === 'preview' || env.APP_ENV === 'production',
		},
	});
}
