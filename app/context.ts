import type { Context } from 'hono';
import type { AppEnv } from './entry.worker';

declare module 'react-router' {
	interface AppLoadContext extends Awaited<ReturnType<typeof getLoadContext>> {}
}

export async function getLoadContext(c: Context<AppEnv>) {
	return {
		cloudflare: {
			caches: globalThis.caches ? caches : void 0,
			cf: c.req.raw.cf,
			ctx: c.executionCtx,
			env: c.env,
		},
	};
}
