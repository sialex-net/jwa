import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Link, Outlet, useMatches } from 'react-router';
import { z } from 'zod';
import { Spacer } from '@/app/components/spacer';
import { Icon } from '@/app/components/ui/icon';
import { appContext, getContext } from '@/app/context.js';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import { cn } from '@/app/utils/cn';
import { useUser } from '@/app/utils/user';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/settings';

export let handle = {
	breadcrumb: <Icon name="file-text">Edit Profile</Icon>,
};

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let user = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.get();

	invariantResponse(user, 'User not found', { status: 404 });
	return {};
}
let BreadcrumbHandleMatch = z.object({
	handle: z.object({ breadcrumb: z.any() }),
});

export default function Component() {
	let user = useUser();
	let matches = useMatches();
	let breadcrumbs = matches
		.map((m) => {
			let result = BreadcrumbHandleMatch.safeParse(m);
			if (!result.success || !result.data.handle.breadcrumb) return null;
			return (
				<Link
					className="flex items-center"
					key={m.id}
					to={m.pathname}
				>
					{result.data.handle.breadcrumb}
				</Link>
			);
		})
		.filter(Boolean);

	return (
		<div className="container m-auto mt-16 mb-24 max-w-3xl">
			<div className="container">
				<ul className="flex gap-3">
					<li>
						<Link
							className="text-gray-6"
							to={`/users/${user.username}`}
						>
							Profile
						</Link>
					</li>
					{breadcrumbs.map((breadcrumb, i, arr) => (
						<li
							className={cn('flex items-center gap-3', {
								'text-gray-6': i < arr.length - 1,
							})}
							// biome-ignore lint/suspicious/noArrayIndexKey: .
							key={i}
						>
							▶ {breadcrumb}
						</li>
					))}
				</ul>
			</div>
			<Spacer size="xs" />
			<main className="mx-auto bg-blue-1 px-6 py-8 md:container md:rounded-3xl">
				<Outlet />
			</main>
		</div>
	);
}

export function meta(_: Route.MetaArgs) {
	return [
		{ title: 'Settings' },
		/* biome-ignore-start assist/source/useSortedKeys: .*/
		{ name: 'description', content: 'Update profile' },
		/* biome-ignore-end assist/source/useSortedKeys: .*/
	];
}
