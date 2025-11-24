import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/root';
import tailwindcssStylesheetUrl from './app.css?url';
import fontStylesheetUrl from './fonts.css?url';

const linksArr = [
	{ as: 'style', href: fontStylesheetUrl, rel: 'preload' },
	{ href: fontStylesheetUrl, rel: 'stylesheet' },
	{ href: tailwindcssStylesheetUrl, rel: 'stylesheet' },
];

export const links: Route.LinksFunction = () =>
	// avoid HMR issue in dev mode
	import.meta.env.MODE === 'development'
		? linksArr
		: [
				{ as: 'style', href: tailwindcssStylesheetUrl, rel: 'preload' },
				...linksArr,
			];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html
			data-theme="dark"
			lang="en"
		>
			<head>
				<meta charSet="utf-8" />
				<meta
					content="width=device-width, initial-scale=1"
					name="viewport"
				/>
				<Meta />
				<Links />
			</head>
			<body className="bg-background font-mono text-foreground">
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = 'Oops!';
	let details = 'An unexpected error occurred.';
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? '404' : 'Error';
		details =
			error.status === 404
				? 'The requested page could not be found.'
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main>
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre>
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
