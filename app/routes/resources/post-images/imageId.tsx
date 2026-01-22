import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { connectClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/imageId';

export async function loader({ params }: Route.LoaderArgs) {
	invariantResponse(params.imageId, 'imageId url parameter is required', {
		status: 400,
	});

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let query = await db
		.select({
			postImages: {
				blob: schema.postImages.blob,
				contentType: schema.postImages.contentType,
				id: schema.postImages.id,
			},
		})
		.from(schema.postImages)
		.where(eq(schema.postImages.id, params.imageId))
		.get();

	client.close();

	invariantResponse(query, `imageId ${params.imageId} does not exist`, {
		status: 404,
	});

	let { blob, contentType, id } = query.postImages;

	return new Response(blob, {
		headers: {
			'cache-control': 'public, max-age=31536000, immutable',
			'content-disposition': `inline; filename="${id}"`,
			'content-length': blob?.byteLength.toString() ?? '',
			'content-type': contentType || '',
		},
	});
}
