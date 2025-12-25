import { Link, useLocation } from 'react-router';
import { GeneralErrorBoundary } from '../components/error-boundary';
import { Icon } from '../components/ui/icon';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/catch-all';

export function loader() {
	throw new Response('Not found', { status: 404 });
}

export function action() {
	throw new Response('Not found', { status: 404 });
}

// fallback if loader fails
export default function (_: Route.ComponentProps) {
	return <ErrorBoundary />;
}

export function ErrorBoundary() {
	let location = useLocation();
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<main className="flex flex-col gap-y-6">
						<div className="flex flex-col gap-y-3">
							<h1>We can't find this page:</h1>
							<pre className="whitespace-pre-wrap break-all">
								{location.pathname}
							</pre>
						</div>
						<Link to="/">
							<Icon name="arrow-left">Back to home</Icon>
						</Link>
					</main>
				),
			}}
		/>
	);
}
