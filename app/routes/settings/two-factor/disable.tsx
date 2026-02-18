import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, redirect } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import * as schema from '@/data/drizzle/schema';
import { requireRecentVerification } from '../../auth/verify.server';
import type { Route } from './+types/disable';
import { twoFAVerificationType } from './two-factor';

export const handle = {
	breadcrumb: <Icon name="lock-open-1">Disable</Icon>,
};

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	await requireRecentVerification(env, {
		request,
		userId: await requireUserId(env, request),
	});
	return {};
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	await requireRecentVerification(env, { request, userId });
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });
	await db
		.delete(schema.verifications)
		.where(
			and(
				eq(schema.verifications.target, userId),
				eq(schema.verifications.type, twoFAVerificationType),
			),
		);
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
