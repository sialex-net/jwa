import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { getAuthenticator } from '@/app/utils/auth.server';
import type { Route } from './+types/github';

export async function loader() {
	return redirect('/login');
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	const providerName = 'github';

	return await getAuthenticator(env).authenticate(providerName, request);
}
