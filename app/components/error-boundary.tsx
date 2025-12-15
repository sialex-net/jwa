import type { ReactElement } from 'react';
import {
	type ErrorResponse,
	isRouteErrorResponse,
	useParams,
	useRouteError,
} from 'react-router';
import { getErrorMessage } from '@/app/utils/get-error-msg';

type StatusHandler = (info: {
	error: ErrorResponse;
	params: Record<string, string | undefined>;
}) => null | ReactElement;

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => (
		<p>
			{error.status} {error.data}
		</p>
	),
	statusHandlers,
	unexpectedErrorHandler = (error) => <p>{getErrorMessage(error)}</p>,
}: {
	defaultStatusHandler?: StatusHandler;
	statusHandlers?: Record<number, StatusHandler>;
	unexpectedErrorHandler?: (error: unknown) => null | ReactElement;
}) {
	let error = useRouteError();
	let params = useParams();
	const isResponse = isRouteErrorResponse(error);

	if (typeof document !== 'undefined') {
		console.error(error);
	}

	return (
		<div className="container flex items-center justify-center p-20 text-h2">
			{isResponse
				? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
						error,
						params,
					})
				: unexpectedErrorHandler(error)}
		</div>
	);
}
