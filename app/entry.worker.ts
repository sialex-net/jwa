import { createRequestHandler } from 'react-router';

function getLoadContext(request: Request, env: Env, ctx: ExecutionContext) {
	return {
		cloudflare: {
			caches: globalThis.caches ? caches : void 0,
			ctx,
			env,
			req: request,
		},
	};
}

declare module 'react-router' {
	interface AppLoadContext extends ReturnType<typeof getLoadContext> {}
}

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		return await requestHandler(request, getLoadContext(request, env, ctx));
	},
} satisfies ExportedHandler<Env>;
