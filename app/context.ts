import type { Context } from 'hono';
import { createContext, RouterContextProvider } from 'react-router';
import type { AppEnv } from './entry.worker';

export let appContext =
	createContext<Awaited<ReturnType<typeof getAppContext>>>();

export function getContext<T>(
	context: Readonly<RouterContextProvider>,
	routerContext: ReturnType<typeof createContext<T>>,
) {
	return context.get(routerContext);
}

async function getAppContext(c: Context<AppEnv>) {
	return {
		cloudflare: {
			caches: globalThis.caches ? caches : void 0,
			cf: c.req.raw.cf,
			ctx: c.executionCtx,
			env: c.env,
		},
	};
}

export async function getLoadContext(c: Context<AppEnv>) {
	let loadContext = new RouterContextProvider();
	loadContext.set(appContext, await getAppContext(c));
	return loadContext;
}
