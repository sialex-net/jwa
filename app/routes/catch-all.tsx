import { Link } from 'react-router';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/catch-all';

export default function Component(_: Route.ComponentProps) {
	return (
		<>
			<div>
				<h1>404</h1>
				<p>Page Not Found</p>
			</div>

			<Link to="/">Go to Homepage</Link>
		</>
	);
}
