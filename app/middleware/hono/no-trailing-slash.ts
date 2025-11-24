import type { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';

export function noTrailingSlash(): MiddlewareHandler {
	return createMiddleware(async (c, next) => {
		if (c.req.path.endsWith('/') && c.req.path !== '/') {
			let url = new URL(c.req.url);
			url.pathname = url.pathname.slice(0, -1);

			c.res = c.redirect(url.toString(), 301);
		}

		await next();
	});
}
