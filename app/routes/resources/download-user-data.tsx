import { eq, getTableColumns, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import { getDomainUrl } from '@/app/utils/get-domain-url';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/download-user-data';

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);

	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let { blob: _userAvatarBlob, ...userAvatarColumnsWithoutBlob } =
		getTableColumns(schema.userAvatar);

	let { blob: _postImagesBlob, ...postImagesColumnsWithoutBlob } =
		getTableColumns(schema.postImages);

	let userData = await db
		.select({
			post: schema.posts,
			postImages: {
				...postImagesColumnsWithoutBlob,
				altText: sql<null | string>`${schema.postImages.altText}`,
			},
			sessions: schema.sessions,
			user: schema.users,
			userAvatar: userAvatarColumnsWithoutBlob,
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.leftJoin(schema.userAvatar, eq(schema.users.id, schema.userAvatar.userId))
		.leftJoin(schema.posts, eq(schema.users.id, schema.posts.userId))
		.leftJoin(schema.postImages, eq(schema.posts.id, schema.postImages.postId))
		.innerJoin(schema.sessions, eq(schema.users.id, schema.sessions.userId));

	let domain = getDomainUrl(request);

	let imagesData = userData
		.map((item) => item.postImages)
		.filter((item) => item !== null)
		.filter(
			(item, index, self) => index === self.findIndex((s) => s.id === item.id),
		)
		.map((item) => ({
			...item,
			url: `${domain}/resources/post-images/${item.id}`,
		}));

	let postsData = userData
		.map((item) => item.post)
		.filter((item) => item !== null)
		.filter(
			(item, index, self) => index === self.findIndex((s) => s.id === item.id),
		)
		.map((item) => {
			let images = imagesData.filter((i) => i.postId === item.id);
			return {
				...item,
				images,
			};
		});

	return Response.json({
		userData: {
			posts: postsData,
			sessions: userData
				.map((item) => item.sessions)
				.filter(
					(item, index, self) =>
						index === self.findIndex((s) => s.id === item.id),
				),
			user: {
				...userData?.[0].user,
				avatar: userData?.[0].userAvatar
					? {
							...userData?.[0].userAvatar,
							url: `${domain}/resources/user-avatar/${userData[0].userAvatar.id}`,
						}
					: null,
			},
		},
	});
}
