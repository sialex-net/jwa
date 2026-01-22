import { invariantResponse } from '@epic-web/invariant';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { GeneralErrorBoundary } from '@/app/components/error-boundary';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUser } from '@/app/utils/auth.server';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/edit-post';
import { PostEditor } from './post-editor';

export { action } from './post-editor.server';

export async function loader({ context, params, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let user = await requireUser(env, request);
	invariantResponse(
		user.username === params.username,
		'You do not have permission to access the requested resource',
		{
			status: 403,
		},
	);

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
			post={loaderData.post}
		/>
	);
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
	return [
		{ title: `Edit post: ${loaderData?.post.title.slice(0, 21)}...` },
		{
			content: loaderData?.post.content ?? loaderData?.post.title,
			name: 'description',
		},
	];
};

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
