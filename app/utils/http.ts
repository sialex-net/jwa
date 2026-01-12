/**
 * Combine multiple header objects into one (uses append so headers are not overridden)
 */
function combineHeaders(...headers: Array<null | ResponseInit['headers']>) {
	let combined = new Headers();
	for (let header of headers) {
		if (!header) continue;
		for (let [key, value] of new Headers(header).entries()) {
			combined.append(key, value);
		}
	}
	return combined;
}

/**
 * Combine multiple response init objects into one (uses combineHeaders)
 */
export function combineResponseInits(
	...responseInits: Array<ResponseInit | undefined>
) {
	let combined: ResponseInit = {};
	for (let responseInit of responseInits) {
		combined = {
			...responseInit,
			headers: combineHeaders(combined.headers, responseInit?.headers),
		};
	}
	return combined;
}
