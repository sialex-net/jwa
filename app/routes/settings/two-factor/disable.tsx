import { Form, redirect } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { appContext, getContext } from '@/app/context';
import { requireUserId } from '@/app/utils/auth.server';
import type { Route } from './+types/disable';

export const handle = {
	breadcrumb: <Icon name="lock-open-1">Disable</Icon>,
};

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	await requireUserId(env, request);
	return {};
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	await requireUserId(env, request);
	throw redirect('/settings/two-factor');
}

export default function Component() {
	return (
		<div className="mx-auto max-w-sm">
			<Form method="POST">
				<p>
					Disabling two factor authentication is not recommended. However, if
					you would like to do so, click here:
				</p>
				<Button
					className="mx-auto"
					name="intent"
					type="submit"
					value="disable"
					variant="destructive"
				>
					Disable 2FA
				</Button>
			</Form>
		</div>
	);
}
