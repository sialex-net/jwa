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

	invariantResponse(
		query.length > 0,
		`postId ${params.postId} does not exist`,
		{
			status: 404,
		},
	);

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

export const meta: Route.MetaFunction = ({ loaderData }) => {
	return [
		{ title: `Edit post: ${loaderData?.data.post.title.slice(0, 21)}...` },
		{
			content: loaderData?.data.post.content ?? loaderData?.data.post.title,
			name: 'description',
		},
	];
};

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
