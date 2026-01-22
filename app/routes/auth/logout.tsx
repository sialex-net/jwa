import { redirect } from 'react-router';
import { appContext, getContext } from '@/app/context';
import { logout } from '@/app/utils/auth.server';
import type { Route } from './+types/logout';

export async function loader() {
	return redirect('/');
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	throw await logout({ env, request });
}
