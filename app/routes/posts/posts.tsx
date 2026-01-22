import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Link, NavLink, Outlet } from 'react-router';
import { Icon } from '@/app/components/ui/icon';
import { connectClientCf } from '@/app/middleware/libsql';
import { cn } from '@/app/utils/cn';
import { getUserImgSrc } from '@/app/utils/images';
import { useOptionalUser } from '@/app/utils/user';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/posts';

export async function loader({ params }: Route.LoaderArgs) {
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let query = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.username, params.username))
		.leftJoin(schema.userAvatar, eq(schema.users.id, schema.userAvatar.userId))
		.leftJoin(schema.posts, eq(schema.users.id, schema.posts.userId));

	client.close();

	invariantResponse(query.length, 'Username not found', { status: 404 });

	return {
		data: {
			owner: {
				email: query[0].users.email,
				image: query[0].user_avatar?.id,
				ownerId: query[0].users.id,
				posts: query[0].posts ? query.map((item) => item.posts) : [],
				username: query[0].users.username,
			},
		},
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	let user = useOptionalUser();
	let isOwner = user?.id === loaderData.data.owner.ownerId;
	let ownerDisplayName = loaderData.data.owner.username;
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
								className="aspect-square h-16 w-16 rounded-full object-cover lg:h-24 lg:w-24"
								src={getUserImgSrc(loaderData.data.owner.image)}
							/>
							<h1 className="text-center font-semibold text-sm md:text-base lg:text-left lg:text-xl">
								<span className="break-all">{ownerDisplayName}'s</span> Posts
							</h1>
						</Link>
						{isOwner ? (
							<div className="p-1 pr-0">
								<NavLink
									className={({ isActive }) =>
										cn(navLinkDefaultClassName, isActive && 'bg-accent')
									}
									to="new"
								>
									<Icon name="plus">New Post</Icon>
								</NavLink>
							</div>
						) : null}
						{loaderData.data.owner.posts.length > 0 ? (
							<ul className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-7 overflow-y-auto overflow-x-hidden pb-12">
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

export const meta: Route.MetaFunction = ({ params, matches }) => {
	let postsMatch = matches.find((m) => m?.id === 'routes/posts/posts') as {
		data: Route.ComponentProps['loaderData'];
	};

	let displayName = postsMatch?.data?.data.owner.username ?? params.username;
	let postCount = postsMatch?.data?.data.owner.posts.length ?? 0;
	let postsText = postCount === 1 ? 'post' : 'posts';
	return [
		{ title: `${displayName}'s Posts | John Wicki` },
		{
			content: `Checkout ${displayName}'s ${postCount} ${postsText} on John Wicki`,
			name: 'description',
		},
	];
};
