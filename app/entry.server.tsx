import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';

export default async function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
	_loadContext: AppLoadContext,
) {
	let userAgent = request.headers.get('user-agent');

	let stream = await renderToReadableStream(
		<ServerRouter
			context={routerContext}
			url={request.url}
		/>,
		{
			onError(error: unknown) {
				console.error(error);
				responseStatusCode = 500;
			},
			signal: request.signal,
		},
	);

	if (userAgent && isbot(userAgent)) {
		await stream.allReady;
	} else responseHeaders.set('transfer-encoding', 'chunked');

	responseHeaders.set('content-type', 'text/html; charset=utf-8');

	return new Response(stream, {
		headers: responseHeaders,
		status: responseStatusCode,
	});
}
