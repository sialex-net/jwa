export function getErrorDescription(error: unknown) {
	if (typeof error === 'string') return error;
	if (
		error instanceof Error ||
		(error &&
			typeof error === 'object' &&
			'message' in error &&
			typeof error.message === 'string' &&
			'name' in error &&
			typeof error.name === 'string')
	) {
		return `${error.name}: ${error.message}`;
	}
	console.error('Unable to get error description for error', error);
	return 'Unknown Error';
}
