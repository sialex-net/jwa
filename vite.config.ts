import path from 'node:path';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { iconsSpritesheet } from 'vite-plugin-icons-spritesheet';

export default defineConfig({
	plugins: [
		cloudflare({ viteEnvironment: { name: 'ssr' } }),
		iconsSpritesheet({
			fileName: 'sprite.svg',
			iconNameTransformer: (name) => name,
			inputDir: './config/svg-icons',
			outputDir: './app/components/ui/icons',
			withTypes: true,
		}),
		reactRouter(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			'@': path.resolve(import.meta.dirname, '.'),
		},
	},
});
