import type { Route } from './+types/home';

export default function Component(_: Route.ComponentProps) {
	return (
		<div className="container px-10 pt-12">
			<p className="text-xl">Select a post</p>
		</div>
	);
}
