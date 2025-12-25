import heroImage from '../assets/images/hero.webp';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/home';

export default function Component(_: Route.ComponentProps) {
	return (
		<div className="flex flex-col items-center gap-y-8 py-32 pt-24">
			<h1 className="font-semibold text-3xl">john wicki</h1>
			<figure>
				<img
					alt="A poster of John Wick"
					className="h-auto w-104"
					src={heroImage}
				/>
				<figcaption className="py-2 text-sm">
					Source:{' '}
					<a
						href="https://displate.com"
						rel="noopener noreferrer"
						target="_blank"
					>
						Displate
					</a>
				</figcaption>
			</figure>
		</div>
	);
}
