import { render } from '@react-email/components';
import type { ReactElement } from 'react';
import { z } from 'zod';

const ResendErrorSchema = z.union([
	z.object({
		message: z.string(),
		name: z.string(),
		statusCode: z.number(),
	}),
	z.object({
		cause: z.any(),
		message: z.literal('Unknown Error'),
		name: z.literal('UnknownError'),
		statusCode: z.literal(500),
	}),
]);
type ResendError = z.infer<typeof ResendErrorSchema>;

const ResendSuccessSchema = z.object({
	id: z.string(),
});

export async function sendEmail(
	env: Env,
	{
		react,
		...options
	}: {
		subject: string;
		to: string;
	} & (
		| { html: string; react?: never; text: string }
		| { html?: never; react: ReactElement; text?: never }
	),
) {
	const from = 'onboarding@resend.dev';

	let email = {
		from,
		...options,
		...(react ? await renderReactEmail(react) : null),
	};

	if (env.APP_ENV === 'development') {
		console.info(
			`APP_ENV === 'development'. Email not actually sent:
${JSON.stringify(email, null, 2)}`,
		);
		return {
			data: { id: 'development' },
			status: 'success',
		} as const;
	}

	let response = await fetch('https://api.resend.com/emails', {
		body: JSON.stringify(email),
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'content-type': 'application/json',
		},
		method: 'POST',
	});
	let data = await response.json();
	let parsedData = ResendSuccessSchema.safeParse(data);

	if (response.ok && parsedData.success) {
		return { data: parsedData, status: 'success' } as const;
	} else {
		let parseResult = ResendErrorSchema.safeParse(data);
		if (parseResult.success) {
			return {
				error: parseResult.data,
				status: 'error',
			} as const;
		} else {
			return {
				error: {
					cause: data,
					message: 'Unknown Error',
					name: 'UnknownError',
					statusCode: 500,
				} satisfies ResendError,
				status: 'error',
			} as const;
		}
	}
}

async function renderReactEmail(react: ReactElement) {
	let [html, text] = await Promise.all([
		render(react),
		render(react, { plainText: true }),
	]);
	return { html, text };
}
