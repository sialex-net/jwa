import {
	data,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from 'react-router';
import { contextStorageMiddleware } from '@/app/middleware/context-storage';
import { libsqlMiddleware } from '@/app/middleware/libsql';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/root';
import tailwindcssStylesheetUrl from './app.css?url';
import { GeneralErrorBoundary } from './components/error-boundary';
import fontStylesheetUrl from './fonts.css?url';
import { ThemeSwitch, useOptionalTheme } from './routes/theme-switch';
import { ClientHintCheck, getHints } from './utils/client-hints';
import { getTheme } from './utils/theme.server';

export const middleware = [contextStorageMiddleware, libsqlMiddleware];

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
			<nav className="py-8">
				<ol className="flex justify-center gap-x-8">
					<li>
						<Link
							className="text-lg"
							to="/"
						>
							Home
						</Link>
					</li>
					<li>
						<Link
							className="text-lg"
							to="/users"
						>
							Users
						</Link>
					</li>
				</ol>
			</nav>
			<Outlet />
			<footer className="flex justify-end gap-x-8 pr-8 pb-8 font-mono">
				<ThemeSwitch userPreference={loaderData.requestInfo.userPrefs.theme} />
			</footer>
		</div>
	);
}

export let ErrorBoundary = GeneralErrorBoundary;
