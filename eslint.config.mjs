import tsParser from '@typescript-eslint/parser';
import perfectionist from 'eslint-plugin-perfectionist';
import { perfectionistConfig } from './config/eslint/perfectionist.config.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		ignores: [
			'**/node_modules/',
			'.git/',
			'.react-router/',
			'.wrangler/',
			'build/',
			'worker-configuration.d.ts',
			'worktrees/',
		],
	},
	{
		files: ['**/*.{mjs,ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			perfectionist,
		},
		rules: { ...perfectionistConfig },
	},
];
