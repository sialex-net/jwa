import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { verifyTOTP } from '@epic-web/totp';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data, Form, redirect, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import { connectClientCf } from '@/app/middleware/libsql';
import { getVerifySessionStorage } from '@/app/utils/verification.server';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/verify';
import { onboardingEmailSessionKey } from './onboarding';

export const codeQueryParam = 'code';
export const targetQueryParam = 'target';
export const typeQueryParam = 'type';
export const redirectToQueryParam = 'redirectTo';

const types = ['onboarding'] as const;
const VerificationTypeSchema = z.enum(types);
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
});

export async function loader({ context, request }: Route.LoaderArgs) {
	const params = new URL(request.url).searchParams;
	if (!params.has(codeQueryParam)) {
		return { result: null };
	}

	let { env } = getContext(context, appContext);

	return validateRequest(env, request, params);
}

export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData();
	let { env } = getContext(context, appContext);
	return validateRequest(env, request, formData);
}

async function validateRequest(
	env: Env,
	request: Request,
	body: FormData | URLSearchParams,
) {
	let submission = parseSubmission(body);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = VerifySchema.superRefine(async (data, ctx) => {
		let verification = await db
			.select({
				algorithm: schema.verifications.algorithm,
				charSet: schema.verifications.charSet,
				digits: schema.verifications.digits,
				period: schema.verifications.period,
				secret: schema.verifications.secret,
			})
			.from(schema.verifications)
			.where(
				or(
					gt(schema.verifications.expiresAt, new Date()),
					isNull(schema.verifications.expiresAt),
				),
			)
			.get();
		if (!verification) {
			ctx.addIssue({
				code: 'custom',
				message: `Invalid code`,
				path: [codeQueryParam],
			});
			return z.NEVER;
		}
		let codeIsValid = await verifyTOTP({
			otp: data[codeQueryParam],
			...verification,
		});
		if (!codeIsValid) {
			ctx.addIssue({
				code: 'custom',
				message: `Invalid code`,
				path: [codeQueryParam],
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

	if (client?.closed) {
		client.reconnect();
	}
	await db
		.delete(schema.verifications)
		.where(
			and(
				eq(schema.verifications.target, result.data[targetQueryParam]),
				eq(schema.verifications.type, result.data[typeQueryParam]),
			),
		);

	const verifySession = await getVerifySessionStorage(env).getSession(
		request.headers.get('cookie'),
	);
	verifySession.set(onboardingEmailSessionKey, result.data[targetQueryParam]);
	return redirect('/onboarding', {
		headers: {
			'set-cookie':
				await getVerifySessionStorage(env).commitSession(verifySession),
		},
	});
}

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	const data = loaderData;
	const [searchParams] = useSearchParams();

	const { form, fields } = useForm(VerifySchema, {
		defaultValue: {
			code: searchParams.get(codeQueryParam) ?? '',
			redirectTo: searchParams.get(redirectToQueryParam) ?? '',
			target: searchParams.get(targetQueryParam) ?? '',
			type: searchParams.get(typeQueryParam) ?? '',
		},
		id: 'verify-form',
		lastResult: actionData?.result ?? data.result,
		// TODO: disable data validation on client for now
		// make better UX if code is too short/ long
		onValidate: () => ({ error: null }),
	});

	return (
		<div className="container flex flex-col justify-center pt-20 pb-32">
			<div className="text-center">
				<h1 className="text-h1">Check your email</h1>
				<p className="mt-3 text-body-md text-muted-foreground">
					We've sent you a code to verify your email address.
				</p>
			</div>

			<Spacer size="xs" />

			<div className="mx-auto flex w-72 max-w-full flex-col justify-center gap-1">
				<div>
					<ErrorList
						errors={form.errors}
						id={form.errorId}
					/>
				</div>
				<div className="flex w-full gap-2">
					<Form
						className="container mx-2 flex max-w-xl flex-col gap-y-2 pt-8"
						method="POST"
						{...form.props}
					>
						<div className="relative">
							<Input
								className="peer pt-7 lowercase leading-5"
								defaultValue={fields[codeQueryParam].defaultValue}
								id={fields[codeQueryParam].id}
								name={fields[codeQueryParam].name}
								placeholder=""
								type="text"
							/>
							<Label
								className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
								htmlFor={fields[codeQueryParam].id}
							>
								Code
							</Label>
							<div
								aria-hidden={true}
								className="sr-only"
								id={fields[codeQueryParam].descriptionId}
							>
								Please enter your verification code
							</div>
							<div
								aria-hidden={true}
								className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
								id={fields[codeQueryParam].errorId}
							>
								{fields[codeQueryParam].errors?.filter(
									(e) => e === 'Invalid code',
								)}
							</div>
						</div>
						<input
							defaultValue={fields[typeQueryParam].defaultValue}
							id={fields[typeQueryParam].id}
							name={fields[typeQueryParam].name}
							type="hidden"
						/>
						<input
							defaultValue={fields[targetQueryParam].defaultValue}
							id={fields[targetQueryParam].id}
							name={fields[targetQueryParam].name}
							type="hidden"
						/>
						<input
							defaultValue={fields[redirectToQueryParam].defaultValue}
							id={fields[redirectToQueryParam].id}
							name={fields[redirectToQueryParam].name}
							type="hidden"
						/>
						<Button
							className="w-full"
							type="submit"
						>
							Submit
						</Button>
					</Form>
				</div>
			</div>
		</div>
	);
}
