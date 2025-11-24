import { z } from 'zod';

const processEnv = z
	.object({
		APP_ENV: z.union([z.literal('development'), z.literal('production')]),
		LOCAL_TURSO_URL: z.url(),
		TURSO_AUTH_TOKEN: z.string(),
		TURSO_URL: z.url(),
	})
	.parse(process.env);

export const { APP_ENV, LOCAL_TURSO_URL, TURSO_AUTH_TOKEN, TURSO_URL } =
	processEnv;
