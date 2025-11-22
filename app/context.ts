export async function getLoadContext(
	request: Request,
	env: Env,
	ctx: ExecutionContext,
) {
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
	interface AppLoadContext extends Awaited<ReturnType<typeof getLoadContext>> {}
}
