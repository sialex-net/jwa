import { createRequestHandler } from 'react-router';
import type { PlatformProxy } from 'wrangler';

declare module 'react-router' {
	export interface AppLoadContext {
		cloudflare: Omit<PlatformProxy<Env>, 'caches' | 'cf' | 'dispose'> & {
			caches: CacheStorage | PlatformProxy<Env>['caches'] | undefined;
			req: Request;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		return await requestHandler(request, {
			cloudflare: {
				caches: globalThis.caches ? caches : void 0,
				ctx,
				env,
				req: request,
			},
		});
	},
} satisfies ExportedHandler<Env>;
