import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { getAuthenticator } from '@/app/utils/auth.server';
import { ProviderNameSchema } from '@/app/utils/connections';
import type { Route } from './+types/provider';

export async function loader() {
	return redirect('/login');
}

export async function action({ context, params, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let providerName = ProviderNameSchema.parse(params.provider);

	return await getAuthenticator(env).authenticate(providerName, request);
}
