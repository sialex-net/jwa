import { createMiddleware } from 'hono/factory';

export function httpsOnly() {
	return createMiddleware(async (c, next) => {
		let url = new URL(c.req.url);

		if (url.protocol !== 'http:') {
			await next();
		}

		url.protocol = 'https:';

		c.res = c.redirect(url.toString());
	});
}
