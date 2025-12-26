import { invariantResponse } from '@epic-web/invariant';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, Link, redirect } from 'react-router';
import { floatingToolbarClassName } from '@/app/components/floating-toolbar';
import { Button } from '@/app/components/ui/button';
import { getClientCf } from '@/app/middleware/libsql';
import { getPostImgSrc } from '@/app/utils/images';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/post-id';

export async function loader({ params }: Route.LoaderArgs) {
	let client = getClientCf();
	let db = drizzle(client, { logger: true, schema });

	let query = await db
		.select({
			content: schema.posts.content,
			createdAt: schema.posts.createdAt,
			id: schema.posts.id,
			images: {
				altText: sql<null | string>`${schema.postImages.altText}`,
				id: schema.postImages.id,
			},
			title: schema.posts.title,
		})
		.from(schema.posts)
		.where(eq(schema.posts.id, params.postId))
		.leftJoin(schema.postImages, eq(schema.posts.id, schema.postImages.postId));

	client.close();

	invariantResponse(query, 'Post not found', { status: 404 });

	return {
		data: {
			post: {
				content: query[0].content,
				created: query[0].createdAt,
				id: query[0].id,
				images: query[0].images ? query.map((item) => item.images) : [],
				title: query[0].title,
			},
		},
	};
}

export async function action({ request, params }: Route.ActionArgs) {
	invariantResponse(params.postId, 'postId param is required');

	let formData = await request.formData();
	let intent = formData.get('intent');

	invariantResponse(intent === 'delete', 'Invalid intent');

	let client = getClientCf();
	let db = drizzle(client, { logger: true, schema });

	await db.delete(schema.posts).where(eq(schema.posts.id, params.postId));
	return redirect(`/users/${params.username}/posts`);
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<div className="absolute inset-0 flex flex-col px-10">
			<h2 className="mb-2 pt-12 font-semibold text-3xl lg:mb-6">
				{loaderData.data.post.title}
			</h2>
			<div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-7 overflow-y-auto pb-24">
				<ul className="flex flex-wrap gap-5 py-5">
					{loaderData.data.post.images.map((image) =>
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
					{loaderData.data.post.content}
				</p>
			</div>
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
		</div>
	);
}
