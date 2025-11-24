/** @knipIgnoreUnresolved */
import type { Route } from './+types/home';

export default function Component({ params }: Route.ComponentProps) {
	return <h1>Posts by {params.username}</h1>;
}
