import { parseSubmission, report } from '@conform-to/react/future';
import { invariantResponse } from '@epic-web/invariant';
import { parseFormData } from '@remix-run/form-data-parser';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { nanoid } from 'nanoid';
import type { ActionFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUser } from '@/app/utils/auth.server';
import * as schema from '@/data/drizzle/schema';
import type { ImageFieldset } from './post-editor';
import { MAX_UPLOAD_SIZE, PostEditorSchema } from './post-editor';

function imageHasFile(
	image: ImageFieldset,
): image is ImageFieldset & { file: NonNullable<ImageFieldset['file']> } {
	return Boolean(image.file?.size && image.file?.size > 0);
}

function imageHasId(
	image: ImageFieldset,
): image is ImageFieldset & { id: string } {
	return Boolean(image.id);
}

export async function action({ context, params, request }: ActionFunctionArgs) {
	let { env } = getContext(context, appContext);
	let user = await requireUser(env, request);
	invariantResponse(
		user.username === params.username,
		'You do not have permission to access the requested resource',
		{
			status: 403,
		},
	);

	let formData = await parseFormData(request, {
		maxFileSize: MAX_UPLOAD_SIZE,
	});

	let submission = parseSubmission(formData);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = PostEditorSchema.superRefine(async (data, ctx) => {
		if (!data.id) return;

		let query = await db
			.select({ posts: { id: schema.posts.id } })
			.from(schema.posts)
			.where(eq(schema.posts.id, data.id))
			.get();

		if (!query) {
			ctx.addIssue({
				code: 'custom',
				message: `postId ${data.id} does not exist`,
			});
		}
	}).transform(async ({ images = [], ...data }) => {
		let postId = data.id ?? nanoid();
		return {
			...data,
			id: postId,
			imageUpdates: await Promise.all(
				images.filter(imageHasId).map(async (i) => {
					if (imageHasFile(i)) {
						let fileExt = i.file.name.split('.').pop();
						return {
							altText: i.altText ?? null,
							blob: await i.file.arrayBuffer(),
							contentType: fileExt
								? `image/${i.file.name.split('.').pop()}`
								: '',
							id: i.id,
						};
					} else {
						return {
							altText: i.altText ?? null,
							id: i.id,
						};
					}
				}),
			),
			newImages: await Promise.all(
				images
					.filter(imageHasFile)
					.filter((i) => !i.id)
					.map(async (image) => {
						let fileExt = image.file.name.split('.').pop();
						return {
							altText: image.altText ?? null,
							blob: await image.file.arrayBuffer(),
							contentType: fileExt
								? `image/${image.file.name.split('.').pop()}`
								: '',
							postId,
						};
					}),
			),
		};
	});

	let result = await superRefined.safeParseAsync(submission.payload);

	if (!result.success) {
		return {
			result: report(submission, {
				error: {
					issues: result.error.issues,
				},
			}),
		};
	}

	invariantResponse(result.data.id, `postId ${result.data.id} does not exist`, {
		status: 404,
	});

	// insert only if new post
	await db
		.insert(schema.posts)
		.values({
			content: result.data.content,
			id: result.data.id,
			title: result.data.title,
			userId: user.id,
		})
		.onConflictDoNothing();

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
			},
			users: {
				title: schema.posts.title,
				username: schema.users.username,
			},
		})
		.from(schema.posts)
		.where(eq(schema.posts.id, result.data.id))
		.leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
		.leftJoin(schema.postImages, eq(schema.posts.id, schema.postImages.postId));

	let ownerUsername = query[0].users.username;

	let postImages = query[0].postImages
		? query.map((item) => item.postImages)
		: [];

	let imageDeletionsIds = postImages
		.filter((postImage) => postImage !== null)
		.map((postImage) => postImage?.id)
		.filter(
			(postImageId) =>
				!result.data.imageUpdates
					.map((imageUpdate) => imageUpdate.id)
					.includes(postImageId),
		);

	// update post
	await db
		.update(schema.posts)
		.set({ content: result.data.content, title: result.data.title })
		.where(eq(schema.posts.id, result.data.id));

	// delete images
	if (imageDeletionsIds.length > 0) {
		await Promise.all(
			imageDeletionsIds.map((i) => {
				return db.delete(schema.postImages).where(eq(schema.postImages.id, i));
			}),
		);
	}

	// update images
	await Promise.all(
		result.data.imageUpdates.map((i) => {
			if (i.blob) {
				return db
					.update(schema.postImages)
					.set({
						altText: i.altText,
						blob: i.blob,
						contentType: i.contentType,
						// new id for cache busting
						id: nanoid(),
					})
					.where(eq(schema.postImages.id, i.id));
			} else {
				return db
					.update(schema.postImages)
					.set({
						altText: i.altText,
					})
					.where(eq(schema.postImages.id, i.id));
			}
		}),
	);

	// add new images
	await Promise.all(
		result.data.newImages.map((i) => {
			return db.insert(schema.postImages).values({
				altText: i.altText,
				blob: i.blob,
				contentType: i.contentType,
				postId: i.postId,
			});
		}),
	);

	return redirect(`/users/${ownerUsername}/posts/${result.data.id}`);
}
