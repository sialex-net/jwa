import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { getAuthenticator } from '@/app/utils/auth.server';
import type { Route } from './+types/callback';

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	const providerName = 'github';

	let profile = await getAuthenticator(env).authenticate(
		providerName,
		request,
		{
			throwOnError: true,
		},
	);

	console.log({ profile });

	throw redirect('/login');
}
