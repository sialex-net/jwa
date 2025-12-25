import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Link, NavLink, Outlet } from 'react-router';
import { getClientCf } from '@/app/middleware/libsql';
import { cn } from '@/app/utils/cn';
import { getUserImgSrc } from '@/app/utils/images';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/posts';

export async function loader({ params }: Route.LoaderArgs) {
	let client = getClientCf();
	let db = drizzle(client, { logger: true, schema });

	let query = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.username, params.username))
		.leftJoin(schema.userImages, eq(schema.users.id, schema.userImages.userId))
		.leftJoin(schema.posts, eq(schema.users.id, schema.posts.userId));

	client.close();

	invariantResponse(query, 'Owner not found', { status: 404 });

	return {
		data: {
			owner: {
				email: query[0].users.email,
				image: query[0].user_images?.id,
				posts: query[0].posts ? query.map((item) => item.posts) : [],
				username: query[0].users.username,
			},
		},
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	let ownerDisplayName =
		loaderData.data.owner.username ?? loaderData.data.owner.email;
	let navLinkDefaultClassName =
		'line-clamp-2 block py-2 pr-6 pl-12 text-base lg:text-lg rounded-l-full';
	return (
		<main className="container flex h-full min-h-[400px] px-0 pb-12 md:px-8">
			<div className="grid w-full grid-cols-4 pl-2 md:container md:mx-2 md:rounded-3xl md:pr-0">
				<div className="relative col-span-1 rounded-l-3xl bg-primary-1">
					<div className="absolute inset-0 flex flex-col">
						<Link
							className="flex flex-col items-center justify-center gap-2 pt-12 pr-4 pb-4 pl-8 lg:flex-row lg:justify-start lg:gap-4"
							to={`/users/${loaderData.data.owner.username}`}
						>
							<img
								alt={ownerDisplayName}
								className="h-16 w-16 rounded-full object-cover lg:h-24 lg:w-24"
								src={getUserImgSrc(loaderData.data.owner.image)}
							/>
							<h1 className="text-center font-semibold text-sm md:text-base lg:text-left lg:text-xl">
								<span className="break-all">{ownerDisplayName}'s</span> Posts
							</h1>
						</Link>
						{loaderData.data.owner.posts.length > 0 ? (
							<ul className="overflow-y-auto overflow-x-hidden pb-12">
								{loaderData.data.owner.posts.map((post) =>
									post ? (
										<li
											className="p-1 pr-0"
											key={post.id}
										>
											<NavLink
												className={({ isActive }) =>
													cn(
														navLinkDefaultClassName,
														isActive && 'bg-primary-2',
													)
												}
												prefetch="intent"
												preventScrollReset
												to={post.id}
											>
												{post.title}
											</NavLink>
										</li>
									) : null,
								)}
							</ul>
						) : (
							<p className="py-2 pr-6 pb-12 pl-12 text-base lg:text-lg">
								No posts found
							</p>
						)}
					</div>
				</div>
				<div className="relative col-span-3 bg-primary-2 md:rounded-r-3xl">
					<Outlet />
				</div>
			</div>
		</main>
	);
}
