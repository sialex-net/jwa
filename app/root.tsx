import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
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
import { connectClientCf, libsqlMiddleware } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/root';
import tailwindcssStylesheetUrl from './app.css?url';
import { GeneralErrorBoundary } from './components/error-boundary';
import { Button } from './components/ui/button';
import { appContext, getContext } from './context';
import fontStylesheetUrl from './fonts.css?url';
import { ThemeSwitch, useOptionalTheme } from './routes/theme-switch';
import { getUserId } from './utils/auth.server';
import { ClientHintCheck, getHints } from './utils/client-hints';
import { getTheme } from './utils/theme.server';
import { useOptionalUser } from './utils/user';

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

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await getUserId(env, request);

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let user = userId
		? await db
				.select({ id: schema.users.id, username: schema.users.username })
				.from(schema.users)
				.where(eq(schema.users.id, userId))
				.get()
		: null;

	client.close();

	return data({
		requestInfo: {
			hints: getHints(request),
			userPrefs: {
				theme: getTheme(request),
			},
		},
		user,
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
	let user = useOptionalUser();
	return (
		<div className="mx-auto flex h-lvh max-w-screen-sm flex-col items-stretch justify-between md:max-w-screen-xl">
			<header className="container">
				<nav className="flex items-center justify-between py-8">
					<Link
						className="text-lg"
						to="/"
					>
						Home
					</Link>
					<ol className="flex items-center gap-x-8">
						<li>
							<Link
								className="text-lg"
								to="/users"
							>
								Users
							</Link>
						</li>
						<li>
							{user ? (
								<div className="flex items-center gap-2">
									<Button
										render={(props) => (
											<Link
												className="flex items-center gap-2"
												to={`/users/${user.username}`}
												{...props}
											>
												Profile
											</Link>
										)}
									/>
								</div>
							) : (
								<Button
									render={(props) => (
										<Link
											className="text-lg"
											to="/login"
											{...props}
										>
											Log In
										</Link>
									)}
								/>
							)}
						</li>
					</ol>
				</nav>
			</header>
			<Outlet />
			<footer className="flex justify-end gap-x-8 pr-8 pb-8 font-mono">
				<ThemeSwitch userPreference={loaderData.requestInfo.userPrefs.theme} />
			</footer>
		</div>
	);
}

export let ErrorBoundary = GeneralErrorBoundary;
