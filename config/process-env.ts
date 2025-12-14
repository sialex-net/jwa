import { z } from 'zod';

const processEnv = z
	.object({
		TURSO_AUTH_TOKEN: z.string(),
		TURSO_URL: z.url(),
	})
	.parse(process.env);

export const { TURSO_AUTH_TOKEN, TURSO_URL } = processEnv;
