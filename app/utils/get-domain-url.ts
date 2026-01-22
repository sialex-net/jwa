export function getDomainUrl(request: Request) {
	let host =
		request.headers.get('X-Forwarded-Host') ??
		request.headers.get('host') ??
		new URL(request.url).host;
	let protocol = request.headers.get('X-Forwarded-Proto') ?? 'http';
	return `${protocol}://${host}`;
}
