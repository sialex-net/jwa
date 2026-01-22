import { invariantResponse } from '@epic-web/invariant';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, Link, redirect } from 'react-router';
import { GeneralErrorBoundary } from '@/app/components/error-boundary';
import { floatingToolbarClassName } from '@/app/components/floating-toolbar';
import { Button } from '@/app/components/ui/button';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUser } from '@/app/utils/auth.server';
import { getPostImgSrc } from '@/app/utils/images';
import { useOptionalUser } from '@/app/utils/user';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/post-id';
import type { Route as PostsRoute } from './+types/posts';

export async function loader({ params }: Route.LoaderArgs) {
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let query = await db
		.select({
			postImages: {
				altText: sql<null | string>`${schema.postImages.altText}`,
				id: schema.postImages.id,
			},
			posts: {
				content: schema.posts.content,
				createdAt: schema.posts.createdAt,
				id: schema.posts.id,
				title: schema.posts.title,
			},
			users: { id: schema.posts.userId },
		})
		.from(schema.posts)
		.where(eq(schema.posts.id, params.postId))
		.leftJoin(schema.postImages, eq(schema.posts.id, schema.postImages.postId));

	client.close();

	invariantResponse(query.length, `postId ${params.postId} does not exist`, {
		status: 404,
	});

	return {
		post: {
			images: query[0].postImages ? query.map((item) => item.postImages) : [],
			...query[0].posts,
			owner: { ...query[0].users },
		},
	};
}

export async function action({ context, params, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let user = await requireUser(env, request);
	invariantResponse(
		user.username === params.username,
		'You do not have permission to access the requested resource',
		{
			status: 403,
		},
	);

	let formData = await request.formData();
	let intent = formData.get('intent');

	invariantResponse(intent === 'delete', 'Invalid intent');

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	await db.delete(schema.posts).where(eq(schema.posts.id, params.postId));
	return redirect(`/users/${params.username}/posts`);
}

export default function Component({ loaderData }: Route.ComponentProps) {
	let user = useOptionalUser();
	let isOwner = user?.id === loaderData.post.owner.id;

	return (
		<div className="absolute inset-0 flex flex-col px-10">
			<h2 className="mb-2 pt-12 font-semibold text-3xl lg:mb-6">
				{loaderData.post.title}
			</h2>
			<div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-7 overflow-y-auto pb-24">
				<ul className="flex flex-wrap gap-5 py-5">
					{loaderData.post.images.map((image) =>
						image ? (
							<li key={image.id}>
								<a href={getPostImgSrc(image.id)}>
									<img
										alt={image.altText ?? ''}
										className="size-32 rounded-lg object-cover"
										height={512}
										src={getPostImgSrc(image.id)}
										width={512}
									/>
								</a>
							</li>
						) : null,
					)}
				</ul>
				<p className="whitespace-break-spaces text-sm md:text-lg">
					{loaderData.post.content}
				</p>
			</div>
			{isOwner ? (
				<div className={floatingToolbarClassName}>
					<Form method="POST">
						<Button
							name="intent"
							type="submit"
							value="delete"
							variant="destructive"
						>
							Delete
						</Button>
					</Form>
					<Button
						render={(props) => (
							<Link
								to="edit"
								{...props}
							>
								Edit
							</Link>
						)}
					/>
				</div>
			) : null}
		</div>
	);
}

export const meta: Route.MetaFunction = ({ loaderData, params, matches }) => {
	let postsMatch = matches.find((m) => m?.id === 'routes/posts/posts') as
		| undefined
		| { data: PostsRoute.ComponentProps['loaderData'] };

	let displayName = postsMatch?.data.owner.username ?? params.username;
	let postTitle = loaderData?.post.title ?? 'Post';
	let postContentsSummary =
		loaderData?.post.content && loaderData?.post.content.length > 100
			? `${loaderData?.post.content.slice(0, 97)}...`
			: 'No content';
	return [
		{ title: `${postTitle} | ${displayName}'s Posts | John Wicki` },
		{
			content: postContentsSummary,
			name: 'description',
		},
	];
};

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
