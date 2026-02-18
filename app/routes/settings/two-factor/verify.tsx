import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { invariant } from '@epic-web/invariant';
import { getTOTPAuthUri } from '@epic-web/totp';
import { and, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as QRCode from 'qrcode';
import { type ActionFunctionArgs, data, Form, redirect } from 'react-router';
import { z } from 'zod';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { isCodeValid } from '@/app/routes/auth/verify.server';
import { requireUserId } from '@/app/utils/auth.server';
import { getDomainUrl } from '@/app/utils/get-domain-url';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/verify';
import { twoFAVerificationType } from './two-factor';

export const handle = {
	breadcrumb: <Icon name="check">Verify</Icon>,
};

const VerifyFormSchema = z.object({
	code: z.string().min(6).max(6),
});

export const twoFAVerifyVerificationType = '2fa-verify';

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });
	let verification = await db
		.select({
			algorithm: schema.verifications.algorithm,
			digits: schema.verifications.digits,
			id: schema.verifications.id,
			period: schema.verifications.period,
			secret: schema.verifications.secret,
		})
		.from(schema.verifications)
		.where(
			and(
				and(
					eq(schema.verifications.target, userId),
					eq(schema.verifications.type, twoFAVerifyVerificationType),
				),
				gt(schema.verifications.expiresAt, new Date()),
			),
		)
		.get();
	if (!verification) {
		return redirect('/settings/two-factor');
	}
	if (client.closed) {
		client.reconnect();
	}
	let user = await db
		.select({ email: schema.users.email })
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.get();
	invariant(user, 'User not found');
	let issuer = new URL(getDomainUrl(request)).host;
	let otpUri = getTOTPAuthUri({
		...verification,
		accountName: user.email,
		issuer,
	});
	let qrCode = await QRCode.toDataURL(otpUri);
	return { otpUri, qrCode };
}

export async function action({ context, request }: ActionFunctionArgs) {
	let { env } = getContext(context, appContext);
	let userId = await requireUserId(env, request);
	let formData = await request.formData();
	let submission = parseSubmission(formData);
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	if (formData.get('intent') === 'cancel') {
		await db
			.delete(schema.verifications)
			.where(
				and(
					eq(schema.verifications.target, userId),
					eq(schema.verifications.type, twoFAVerifyVerificationType),
				),
			);
		return redirect('/settings/two-factor');
	}

	let superRefined = VerifyFormSchema.superRefine(async (data, ctx) => {
		let codeIsValid = await isCodeValid({
			code: data.code,
			target: userId,
			type: twoFAVerifyVerificationType,
		});
		if (!codeIsValid) {
			ctx.addIssue({
				code: 'custom',
				message: 'Invalid code',
				path: ['code'],
			});
			return z.NEVER;
		}
	});

	let result = await superRefined.safeParseAsync(submission.payload);

	if (!result.success) {
		return data(
			{
				result: report(submission, {
					error: {
						issues: result.error.issues,
					},
				}),
			},
			{ status: 400 },
		);
	}

	if (client.closed) {
		client.reconnect();
	}
	await db
		.update(schema.verifications)
		.set({ expiresAt: null, type: twoFAVerificationType })
		.where(
			and(
				eq(schema.verifications.target, userId),
				eq(schema.verifications.type, twoFAVerifyVerificationType),
			),
		);

	throw redirect('/settings/two-factor');
}

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	let { fields, form } = useForm(VerifyFormSchema, {
		id: 'verify-form',
		lastResult: actionData?.result,
		onValidate: ({ error, formData }) => {
			if (formData.get('intent') === 'cancel') return;
			return { error };
		},
	});

	return (
		<div>
			<div className="flex flex-col items-center gap-4">
				<img
					alt="qr code"
					className="h-56 w-56"
					src={loaderData.qrCode}
				/>
				<p>Scan this QR code with your authenticator app.</p>
				<p className="text-sm">
					If you cannot scan the QR code, you can manually add this account to
					your authenticator app using this code:
				</p>
				<figure className="p-3">
					<pre className="whitespace-pre-wrap break-all text-sm">
						{loaderData.otpUri}
					</pre>
					<figcaption>"One-time Password URI"</figcaption>
				</figure>
				<p className="text-sm">
					Once you've added the account, enter the code from your authenticator
					app below. Once you enable 2FA, you will need to enter a code from
					your authenticator app every time you log in or perform important
					actions. Do not lose access to your authenticator app, or you will
					lose access to your account.
				</p>
				<div className="flex w-full max-w-xs flex-col justify-center gap-4">
					<Form
						className="flex-1"
						method="POST"
						{...form.props}
					>
						<div className="relative">
							<Input
								autoFocus={true}
								className="peer pt-7 lowercase leading-5"
								defaultValue={fields.code.defaultValue}
								id={fields.code.id}
								name={fields.code.name}
								placeholder=""
								type="text"
							/>
							<Label
								className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
								htmlFor={fields.code.id}
							>
								Code
							</Label>
							<div
								aria-hidden={true}
								className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
								id={fields.code.errorId}
							>
								{fields.code.errors}
							</div>
						</div>
						<div className="flex justify-between gap-4">
							<Button
								className="w-full"
								name="intent"
								type="submit"
								value="verify"
							>
								Submit
							</Button>
							<Button
								className="w-full"
								name="intent"
								type="submit"
								value="cancel"
								variant="secondary"
							>
								Cancel
							</Button>
						</div>
					</Form>
				</div>
			</div>
		</div>
	);
}
