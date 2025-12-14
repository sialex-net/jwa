import { WorkerEntrypoint } from 'cloudflare:workers';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { getLoadContext } from './context';
import { httpsOnly } from './middleware/hono/https-only';
import { noTrailingSlash } from './middleware/hono/no-trailing-slash';
import { reactRouter } from './middleware/hono/react-router';

export interface AppEnv {
	Bindings: Env;
}

class HonoRequestHandler extends WorkerEntrypoint<Env> {
	private app: Hono<AppEnv>;

	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env);
		this.app = new Hono<AppEnv>();

		if (import.meta.env.DEV) {
			this.app.use(logger());
		}

		if (env.APP_ENV === 'preview' || env.APP_ENV === 'production') {
			this.app.use(httpsOnly());
		}

		this.app.use(noTrailingSlash());

		this.bootstrap();
	}

	override async fetch(request: Request) {
		return await this.app.fetch(request, this.env, this.ctx);
	}

	private bootstrap() {
		this.app.use(
			reactRouter({
				build: () => import('virtual:react-router/server-build'),
				loadContext: (c) => getLoadContext(c),
				mode: import.meta.env.MODE,
			}),
		);
	}
}

export { HonoRequestHandler as default };
