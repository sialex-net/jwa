import { createCookieSessionStorage } from 'react-router';

export function getSessionStorage(env: Env) {
	let sessionStorage = createCookieSessionStorage({
		cookie: {
			httpOnly: true,
			name: 'en_session',
			path: '/',
			sameSite: 'lax',
			secrets: env.SESSION_SECRET.split(','),
			secure: env.APP_ENV === 'preview' || env.APP_ENV === 'production',
		},
	});

	// we have to do this because every time you commit the session you overwrite it
	// so we store the expiration time in the cookie and reset it every time we commit
	let originalCommitSession = sessionStorage.commitSession;

	Object.defineProperty(sessionStorage, 'commitSession', {
		value: async function commitSession(
			...args: Parameters<typeof originalCommitSession>
		) {
			let [session, options] = args;
			if (options?.expires) {
				session.set('expires', options.expires);
			}
			if (options?.maxAge) {
				session.set('expires', new Date(Date.now() + options.maxAge * 1000));
			}
			let expires = session.has('expires')
				? new Date(session.get('expires'))
				: undefined;
			let setCookieHeader = await originalCommitSession(session, {
				...options,
				expires,
			});
			return setCookieHeader;
		},
	});

	return sessionStorage;
}
