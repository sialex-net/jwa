import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersProject({
	optimizeDeps: {
		include: ['react/jsx-dev-runtime'],
	},
	server: {
		fs: {
			strict: false,
		},
	},
	test: {
		alias: {
			'@': new URL('../../', import.meta.url).pathname,
		},
		browser: {
			enabled: true,
			headless: true,
			instances: [{ browser: 'chromium' }],
			provider: 'playwright',
		},
		include: ['../../app/**/*.browser.test.{ts,tsx}'],
		includeTaskLocation: true,
		name: 'browser tests',
		poolOptions: {
			workers: {
				wrangler: {
					configPath: '../../wrangler.jsonc',
				},
			},
		},
		setupFiles: ['./setup.browser.tsx'],
	},
});
