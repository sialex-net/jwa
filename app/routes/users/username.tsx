/** @knipIgnoreUnresolved */
import type { Route } from './+types/username';

export default function Component({ params }: Route.ComponentProps) {
	return <p>{params.username}</p>;
}
