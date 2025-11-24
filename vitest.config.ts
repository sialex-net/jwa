import path from 'node:path';
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		css: true,
		globals: true,
		poolOptions: {
			workers: {
				wrangler: {
					configPath: './wrangler.jsonc',
				},
			},
		},
		projects: [
			{
				test: {
					environment: 'node',
					exclude: ['./app/**/*.browser.test.{ts,tsx}', './tests/e2e/**'],
					include: [
						'./app/**/*.server.test.{ts,tsx}',
						'./app/**/*.test.{ts,tsx}',
						'./tests/**/*.server.test.{ts,tsx}',
						'./tests/**/*.test.{ts,tsx}',
					],
					name: 'server tests',
				},
			},
			{
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
						'@': path.resolve(import.meta.dirname, '.'),
					},
					browser: {
						enabled: true,
						headless: true,
						instances: [{ browser: 'chromium' }],
						provider: 'playwright',
					},
					exclude: ['./app/**/*.server.test.{ts,tsx}'],
					include: [
						'./app/**/*.browser.test.{ts,tsx}',
						'./app/**/*.test.{ts,tsx}',
					],
					includeTaskLocation: true,
					name: 'browser tests',
					setupFiles: ['./tests/setup.browser.tsx'],
				},
			},
		],
	},
});
