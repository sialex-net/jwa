import {
	createExecutionContext,
	env,
	SELF,
	waitOnExecutionContext,
} from 'cloudflare:test';
import { describe, expect, test } from 'vitest';
import worker from '../test-worker';

let IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Hello World worker', () => {
	test('responds with Hello from test worker! (unit style)', async () => {
		let request = new IncomingRequest('http://example.com');
		// Create an empty context to pass to `worker.fetch()`.
		let ctx = createExecutionContext();
		let response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(
			`"Hello from test worker!"`,
		);
	});

	test('responds with Hello from test worker! (integration style)', async () => {
		let response = await SELF.fetch('https://example.com');
		expect(await response.text()).toMatchInlineSnapshot(
			`"Hello from test worker!"`,
		);
	});

	test('dispatches fetch event', async () => {
		let request = new IncomingRequest('http://example.com');
		let ctx = createExecutionContext();
		let response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});
});
