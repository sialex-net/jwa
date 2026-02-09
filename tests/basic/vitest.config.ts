import { defineWorkersProject } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersProject({
	test: {
		alias: {
			'@': new URL('../../', import.meta.url).pathname,
		},
		include: ['./*.test.ts'],
		name: 'basic tests',
		poolOptions: {
			workers: {
				main: '../test-worker.ts',
				wrangler: {
					configPath: '../../wrangler.jsonc',
				},
			},
		},
	},
});
