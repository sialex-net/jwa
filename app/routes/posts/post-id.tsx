import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, Link } from 'react-router';
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
		.select()
		.from(schema.posts)
		.where(eq(schema.posts.id, params.postId))
		.leftJoin(schema.postImages, eq(schema.posts.id, schema.postImages.postId));

	client.close();

	invariantResponse(query, 'Post not found', { status: 404 });

	return {
		data: {
			post: {
				content: query[0].posts.content,
				created: query[0].posts.createdAt,
				id: query[0].posts.id,
				images: query[0].post_images
					? query.map((item) => item.post_images)
					: [],
				title: query[0].posts.title,
			},
		},
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<div className="absolute inset-0 flex flex-col px-10">
			<h2 className="mb-2 pt-12 font-semibold text-3xl lg:mb-6">
				{loaderData.data.post.title}
			</h2>
			<div className="overflow-y-auto pb-24">
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
