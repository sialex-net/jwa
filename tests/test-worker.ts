export default {
	async fetch(_request, _env, _ctx): Promise<Response> {
		return new Response('Hello from test worker!');
	},
} satisfies ExportedHandler<Env>;
