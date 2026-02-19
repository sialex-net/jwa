import * as cookie from 'cookie';

const key = 'redirectTo';
export let destroyRedirectToHeader = cookie.serialize(key, '', {
	maxAge: -1,
});

export function getRedirectCookieHeader(redirectTo?: string) {
	return redirectTo && redirectTo !== '/'
		? cookie.serialize(key, redirectTo, { path: '/' })
		: null;
}

export function getRedirectCookieValue(request: Request) {
	let rawCookie = request.headers.get('cookie');
	let parsedCookies = rawCookie ? cookie.parse(rawCookie) : {};
	let redirectTo = parsedCookies[key];
	return redirectTo || null;
}
