import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { connectClientCf } from '@/app/middleware/libsql';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/imageId';

export async function loader({ params }: Route.LoaderArgs) {
	invariantResponse(params.imageId, 'Image ID is required', { status: 400 });

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let image = await db
		.select()
		.from(schema.userImages)
		.where(eq(schema.userImages.id, params.imageId))
		.get();

	client.close();

	invariantResponse(image, 'Not found', { status: 404 });

	return new Response(image.blob, {
		headers: {
			'cache-control': 'public, max-age=31536000, immutable',
			'content-disposition': `inline; filename="${params.imageId}"`,
			'content-length': image.blob?.byteLength.toString() ?? '',
			'content-type': image.contentType || '',
		},
	});
}
