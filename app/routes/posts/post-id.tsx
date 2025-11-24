/** @knipIgnoreUnresolved */
import type { Route } from './+types/post-id';

export default function Component({ params }: Route.ComponentProps) {
	return (
		<h1>
			{params.postId} by {params.username}
		</h1>
	);
}
