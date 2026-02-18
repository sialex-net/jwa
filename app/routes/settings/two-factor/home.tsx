import { generateTOTP } from '@epic-web/totp';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, Link, redirect } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { requireUserId } from '@/app/utils/auth.server';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/home';
import { twoFAVerificationType } from './two-factor';
import { twoFAVerifyVerificationType } from './verify';

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });
	let verification = await db
		.select()
		.from(schema.verifications)
		.where(
			and(
				eq(schema.verifications.target, userId),
				eq(schema.verifications.type, twoFAVerificationType),
			),
		)
		.get();
	return { isTwoFAEnabled: Boolean(verification) };
}

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let { otp: _otp, ...config } = await generateTOTP();
	let verificationData = {
		...config,
		expiresAt: new Date(Date.now() + 1000 * 60 * 10),
		target: userId,
		type: twoFAVerifyVerificationType,
	};
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });
	await db
		.insert(schema.verifications)
		.values(verificationData)
		.onConflictDoUpdate({
			set: verificationData,
			target: [schema.verifications.target, schema.verifications.type],
		});

	return redirect('/settings/two-factor/verify');
}

export default function Component({ loaderData }: Route.ComponentProps) {
	return (
		<div className="flex flex-col gap-4">
			{loaderData.isTwoFAEnabled ? (
				<>
					<p className="text-lg">
						<Icon name="check">
							You have enabled two-factor authentication.
						</Icon>
					</p>
					<Link to="disable">
						<Icon name="lock-open-1">Disable 2FA</Icon>
					</Link>
				</>
			) : (
				<>
					<p>
						<Icon name="lock-open-1">
							You have not enabled two-factor authentication yet.
						</Icon>
					</p>
					<p className="text-sm">
						Two factor authentication adds an extra layer of security to your
						account. You will need to enter a code from an authenticator app
						like{' '}
						<a
							className="underline"
							href="https://1password.com/"
						>
							1Password
						</a>{' '}
						to log in.
					</p>
					<Form method="POST">
						<Button
							className="mx-auto"
							name="intent"
							type="submit"
							value="enable"
						>
							Enable 2FA
						</Button>
					</Form>
				</>
			)}
		</div>
	);
}
