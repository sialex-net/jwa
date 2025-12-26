import { invariantResponse } from '@epic-web/invariant';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { getClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/edit-post';
import { PostEditor } from './post-editor';

export { action } from './post-editor.server';

export async function loader({ params }: Route.LoaderArgs) {
	let client = getClientCf();
	let db = drizzle({ client, logger: true, schema });

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

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	return (
		<PostEditor
			actionData={actionData}
			post={loaderData.data.post}
		/>
	);
}
