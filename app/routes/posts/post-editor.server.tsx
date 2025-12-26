import { parseSubmission, report } from '@conform-to/react/future';
import { coerceFormValue } from '@conform-to/zod/v4/future';
import { invariantResponse } from '@epic-web/invariant';
import { parseFormData } from '@remix-run/form-data-parser';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { nanoid } from 'nanoid';
import { type ActionFunctionArgs, redirect } from 'react-router';
import { getClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
import {
	type ImageFieldset,
	MAX_UPLOAD_SIZE,
	PostEditorSchema,
} from './post-editor';

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

export async function action({ request }: ActionFunctionArgs) {
	let formData = await parseFormData(request, {
		maxFileSize: MAX_UPLOAD_SIZE,
	});

	let submission = parseSubmission(formData);

	let client = getClientCf();
	let db = drizzle({ client, logger: true, schema });

	let superRefined = coerceFormValue(
		PostEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return;

			let post = await db
				.select({ id: schema.posts.id })
				.from(schema.posts)
				.where(eq(schema.posts.id, data.id))
				.get();

			if (!post) {
				ctx.addIssue({
					code: 'custom',
					message: 'Post not found',
				});
			}
		}).transform(async ({ images = [], ...data }) => {
			let postId = data.id;
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
								newId: nanoid(),
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
		}),
	);

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

	invariantResponse(result.data.id, 'Post id not found', { status: 404 });

	let post = await db
		.select({
			content: schema.posts.content,
			createdAt: schema.posts.createdAt,
			id: schema.posts.id,
			images: {
				altText: sql<null | string>`${schema.postImages.altText}`,
				id: schema.postImages.id,
			},
			owner: schema.users.username,
			title: schema.posts.title,
		})
		.from(schema.posts)
		.where(eq(schema.posts.id, result.data.id))
		.leftJoin(schema.users, eq(schema.posts.userId, schema.users.id))
		.leftJoin(schema.postImages, eq(schema.posts.id, schema.postImages.postId));

	let owner = post[0].owner;

	let postImages = post[0].images ? post.map((item) => item.images) : [];

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
			if (i.newId) {
				return db
					.update(schema.postImages)
					.set({
						altText: i.altText,
						blob: i.blob,
						contentType: i.contentType,
						id: i.newId,
					})
					.where(eq(schema.postImages.id, i.id));
			} else {
				return db
					.update(schema.postImages)
					.set({
						altText: i.altText,
						id: i.newId,
					})
					.where(eq(schema.postImages.id, i.id));
			}
		}),
	);

	// add images
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

	return redirect(`/users/${owner}/posts/${result.data.id}`);
}
