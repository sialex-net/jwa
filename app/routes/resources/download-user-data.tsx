import { eq, getTableColumns } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import { getDomainUrl } from '@/app/utils/get-domain-url';
import type { SelectPost, SelectPostImage } from '@/data/drizzle/schema';
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
			postImages: postImagesColumnsWithoutBlob,
			user: schema.users,
			userImage: userAvatarColumnsWithoutBlob,
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.leftJoin(schema.userAvatar, eq(schema.users.id, schema.userAvatar.userId))
		.leftJoin(schema.posts, eq(schema.users.id, schema.posts.userId))
		.leftJoin(schema.postImages, eq(schema.posts.id, schema.postImages.postId));

	let domain = getDomainUrl(request);

	let postsData: Array<
		SelectPost & {
			images: Array<Omit<SelectPostImage, 'blob'> & { url: string }>;
		}
	> = [];

	for (let userDataItem of userData) {
		// if true already pushed
		let inPostsData = postsData.some(
			(item) => item.id === userDataItem.post?.id,
		);
		if (!inPostsData && userDataItem.post) {
			postsData.push({ ...userDataItem.post, images: [] });
		}

		// index position of parent
		let idxOfPost = postsData.findIndex(
			(item) => item.id === userDataItem.postImages?.postId,
		);
		if (idxOfPost !== -1 && userDataItem.postImages) {
			let id = userDataItem.postImages.id;
			postsData[idxOfPost].images.push({
				...userDataItem.postImages,
				url: `${domain}/resources/post-images/${id}`,
			});
		}
	}

	return Response.json({
		userData: {
			posts: postsData,
			user: {
				...userData?.[0].user,
				image: userData?.[0].userImage
					? {
							...userData?.[0].userImage,
							url: `${domain}/resources/user-avatar/${userData[0].userImage.id}`,
						}
					: null,
			},
		},
	});
}
