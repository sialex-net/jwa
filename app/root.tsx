import {
	data,
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
import { ThemeSwitch, useOptionalTheme } from './routes/theme-switch';
import { ClientHintCheck, getHints } from './utils/client-hints';
import { getTheme } from './utils/theme.server';

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

export async function loader({ request }: Route.LoaderArgs) {
	return data({
		requestInfo: {
			hints: getHints(request),
			userPrefs: {
				theme: getTheme(request),
			},
		},
	});
}

export function Layout({ children }: { children: React.ReactNode }) {
	let theme = useOptionalTheme() || 'light';
	return (
		<html
			data-theme={theme}
			lang="en"
		>
			<head>
				<ClientHintCheck />
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

export default function App({ loaderData }: Route.ComponentProps) {
	return (
		<div className="mx-auto flex h-lvh max-w-screen-sm flex-col items-stretch justify-between">
			<Outlet />
			<footer className="flex justify-end gap-x-8 pr-8 pb-8 font-mono">
				<ThemeSwitch userPreference={loaderData.requestInfo.userPrefs.theme} />
			</footer>
		</div>
	);
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
