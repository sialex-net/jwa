import type { ReactElement } from 'react';
import {
	type ErrorResponse,
	isRouteErrorResponse,
	useParams,
	useRouteError,
} from 'react-router';
import { getErrorDescription } from '@/app/utils/get-error-desc';

type StatusHandler = (info: {
	error: ErrorResponse;
	params: Record<string, string | undefined>;
}) => null | ReactElement;

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => (
		<div className="flex flex-col gap-y-4">
			<p>
				{error.status}: {error.statusText}
			</p>
			<p>{error.data}</p>
		</div>
	),
	statusHandlers,
	unexpectedErrorHandler = (error) => (
		<div className="flex flex-col gap-y-4">
			<p>500: Internal Server Error</p>
			<p>
				Sorry, something went wrong on our side. If the problem persists, please
				contact support for assistance.
			</p>
			{import.meta.env.DEV ? (
				<p className="pt-16">{getErrorDescription(error)}</p>
			) : null}
		</div>
	),
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
		<div className="container flex flex-col items-center p-20">
			{isResponse
				? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
						error,
						params,
					})
				: unexpectedErrorHandler(error)}
		</div>
	);
}
