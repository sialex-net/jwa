import filmSummaries from '../assets/films/film-summaries.json';
import heroImage from '../assets/images/hero.webp';
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
			<section>
				<h2 className="py-8 font-semibold text-xl">Film Summaries</h2>
				<ol className="flex flex-col gap-y-8">
					{filmSummaries.map((film) => (
						<li key={film.id}>
							<div>
								<h3 className="py-2 font-semibold underline">{film.title}</h3>
								<p>{film.summary}</p>
							</div>
						</li>
					))}
				</ol>
			</section>
		</div>
	);
}

export const meta: Route.MetaFunction = () => {
	return [
		{ title: 'Welcome to John Wicki' },
		{
			content: 'Welcome to John Wicki',
			name: 'description',
		},
	];
};
