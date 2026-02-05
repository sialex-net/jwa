import { describe, expect, test } from 'vitest';
import { default as routeDefault } from './home';

const routeComponentProps = {
	loaderData: undefined,
	// biome-ignore lint/suspicious/noExplicitAny: .
	matches: [] as any,
	params: {},
};

describe('home route', () => {
	test('should render page text', async ({ renderStub }) => {
		const rendered = await renderStub({
			entries: [
				{
					Component: () => routeDefault(routeComponentProps),
					path: '/',
				},
			],
			props: { initialEntries: ['/'] },
		});

		const getByText = rendered.getByText('john wicki', {
			exact: true,
		});
		expect(getByText).toHaveTextContent('john');
	});
});
