import { invariant } from '@epic-web/invariant';
import { redirect } from 'react-router';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import { onboardingEmailSessionKey } from './onboarding';
import type { VerifyFunctionArgs } from './verify.server';

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
