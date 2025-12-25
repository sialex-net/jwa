import type { Route } from './+types/edit-post';

export default function Component({ params }: Route.ComponentProps) {
	return <h1>Edit post: {params.postId} </h1>;
}
