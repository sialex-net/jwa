import { createRequestHandler } from 'react-router';
import { getLoadContext } from './context';

const requestHandler = createRequestHandler(
	() => import('virtual:react-router/server-build'),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		return await requestHandler(request, getLoadContext(request, env, ctx));
	},
} satisfies ExportedHandler<Env>;
