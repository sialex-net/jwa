import type { Context, MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import type {
	CreateRequestHandlerFunction,
	RouterContextProvider,
} from 'react-router';
import { createRequestHandler } from 'react-router';

interface ReactRouterMiddlewareOptions {
	build: Parameters<CreateRequestHandlerFunction>[0];
	loadContext?:
		| ((ctx: Context) => Promise<RouterContextProvider> | RouterContextProvider)
		| RouterContextProvider;
	mode?: Parameters<CreateRequestHandlerFunction>[1];
}

export function reactRouter({
	build,
	loadContext,
	mode,
}: ReactRouterMiddlewareOptions): MiddlewareHandler {
	return createMiddleware(async (c) => {
		let requestHandler = createRequestHandler(build, mode);
		let context =
			typeof loadContext === 'function' ? loadContext(c) : loadContext;

		return await requestHandler(
			c.req.raw,
			context instanceof Promise ? await context : context,
		);
	});
}
