import { describe, expect, test } from 'vitest';
import { default as routeDefault } from './home';

describe('home route', () => {
	// biome-ignore lint/suspicious/noTsIgnore: it exists
	// @ts-ignore: Property 'renderStub' does not exist on type 'TestContext'
	test('should render page text', async ({ renderStub }) => {
		let rendered = await renderStub({
			entries: [
				{
					// @ts-expect-error
					Component: () => routeDefault(),
					path: '/',
				},
			],
			props: { initialEntries: ['/'] },
		});

		let actual = rendered.getByText('john wicki').element().textContent;
		expect(actual).toMatch(/john/);
	});
});
