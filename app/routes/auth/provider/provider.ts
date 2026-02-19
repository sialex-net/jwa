import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { getAuthenticator } from '@/app/utils/auth.server';
import { ProviderNameSchema } from '@/app/utils/connections';
import { getReferrerRoute } from '@/app/utils/http';
import { getRedirectCookieHeader } from '@/app/utils/redirect-cookie.server';
import type { Route } from './+types/provider';

export async function loader() {
	return redirect('/login');
}

export async function action({ context, params, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let providerName = ProviderNameSchema.parse(params.provider);
	try {
		return await getAuthenticator(env).authenticate(providerName, request);
	} catch (error: unknown) {
		if (error instanceof Response) {
			let formData = await request.formData();
			let rawRedirectTo = formData.get('redirectTo');
			let redirectTo =
				typeof rawRedirectTo === 'string'
					? rawRedirectTo
					: getReferrerRoute(request);
			let redirectToCookie = getRedirectCookieHeader(redirectTo);
			if (redirectToCookie) {
				error.headers.append('set-cookie', redirectToCookie);
			}
		}
		throw error;
	}
}
