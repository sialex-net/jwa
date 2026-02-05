import { getErrorDescription } from './get-error-desc';

export async function sendEmail(
	env: Env,
	options: {
		html?: string;
		subject: string;
		text: string;
		to: string;
	},
) {
	const from = 'onboarding@resend.dev';

	const email = {
		from,
		...options,
	};

	if (env.APP_ENV === 'development') {
		console.info(email);
		return { status: 'success' } as const;
	} else {
		const response = await fetch('https://api.resend.com/emails', {
			body: JSON.stringify(email),
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				'content-type': 'application/json',
			},
			method: 'POST',
		});
		const data = await response.json();

		if (response.ok) {
			return { status: 'success' } as const;
		} else {
			return {
				error: getErrorDescription(data),
				status: 'error',
			} as const;
		}
	}
}
