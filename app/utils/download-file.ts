export async function downloadFile(url: string, retries: number = 0) {
	const MAX_RETRIES = 3;
	try {
		let response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch image with status ${response.status}`);
		}
		let contentType = response.headers.get('content-type') ?? 'image/jpg';
		let blob = await response.arrayBuffer();
		return { blob, contentType };
	} catch (e) {
		if (retries > MAX_RETRIES) throw e;
		return downloadFile(url, retries + 1);
	}
}
