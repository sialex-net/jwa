import { invariant } from '@epic-web/invariant';
import type { Params } from 'react-router';
import { redirect } from 'react-router';
import { z } from 'zod';
import { requireAnonymous } from '@/app/utils/auth.server';
import { ProviderNameSchema } from '@/app/utils/connections';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import type { VerifyFunctionArgs } from '../verify.server';
import { onboardingEmailSessionKey, providerIdKey } from './provider';

export async function requireData(
	env: Env,
	{
		params,
		request,
	}: {
		params: Params;
		request: Request;
	},
) {
	await requireAnonymous(env, request);
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	let email = verifySession.get(onboardingEmailSessionKey);
	let providerId = verifySession.get(providerIdKey);
	let result = z
		.object({
			email: z.string(),
			providerId: z.string(),
			providerName: ProviderNameSchema,
		})
		.safeParse({ email, providerId, providerName: params.provider });
	if (result.success) {
		return result.data;
	} else {
		console.error(result.error);
		throw redirect('/signup');
	}
}

export async function handleVerification(
	env: Env,
	{ request, result }: VerifyFunctionArgs,
) {
	invariant(result, 'result should be defined by now');
	let verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	verifySession.set(onboardingEmailSessionKey, result.target);
	return redirect('/onboarding', {
		headers: {
			'set-cookie':
				await getVerifySessionStorage(env).commitSession(verifySession),
		},
	});
}
