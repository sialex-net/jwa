import { fetchMock } from 'cloudflare:test';
import { afterEach, beforeAll, expect, it } from 'vitest';

beforeAll(() => {
	// Enable outbound request mocking...
	fetchMock.activate();
	// ...and throw errors if an outbound request isn't mocked
	fetchMock.disableNetConnect();
});
// Ensure we matched every mock we defined
afterEach(() => fetchMock.assertNoPendingInterceptors());

it('mocks requests', async () => {
	// Mock the first request to `https://example.com`
	fetchMock
		.get('https://example.com')
		.intercept({ path: '/' })
		.reply(200, 'body');

	const response = await fetch('https://example.com/');
	expect(await response.text()).toBe('body');
});
