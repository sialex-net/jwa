import { parseSubmission, report } from '@conform-to/react/future';
import { generateTOTP, verifyTOTP } from '@epic-web/totp';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { data } from 'react-router';
import { z } from 'zod';
import { connectClientCf } from '@/app/middleware/libsql';
import { getDomainUrl } from '@/app/utils/get-domain-url';
import * as schema from '@/data/drizzle/schema';
import { handleVerification as handleOnboardingVerification } from './onboarding.server';
import type { VerificationTypes } from './verify';
import {
	codeQueryParam,
	redirectToQueryParam,
	targetQueryParam,
	typeQueryParam,
	VerifyFormSchema,
} from './verify';

export type VerifyFunctionArgs = {
	body: FormData | URLSearchParams;
	request: Request;
	result: z.infer<typeof VerifyFormSchema>;
};

export function getRedirectToUrl({
	request,
	type,
	target,
	redirectTo,
}: {
	redirectTo?: string;
	request: Request;
	target: string;
	type: VerificationTypes;
}) {
	let redirectToUrl = new URL(`${getDomainUrl(request)}/verify`);
	redirectToUrl.searchParams.set(typeQueryParam, type);
	redirectToUrl.searchParams.set(targetQueryParam, target);
	if (redirectTo) {
		redirectToUrl.searchParams.set(redirectToQueryParam, redirectTo);
	}
	return redirectToUrl;
}

export async function prepareVerification({
	period,
	request,
	type,
	target,
	redirectTo: postVerificationRedirectTo,
}: {
	period: number;
	redirectTo?: string;
	request: Request;
	target: string;
	type: VerificationTypes;
}) {
	let verifyUrl = getRedirectToUrl({
		redirectTo: postVerificationRedirectTo,
		request,
		target,
		type,
	});
	let redirectTo = new URL(verifyUrl.toString());

	let { otp, ...verificationConfig } = await generateTOTP({
		algorithm: 'SHA-256',
		period,
	});

	let verificationData = {
		target,
		type,
		...verificationConfig,
		expiresAt: new Date(Date.now() + verificationConfig.period * 1000),
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

	verifyUrl.searchParams.set(codeQueryParam, otp);

	return { otp, redirectTo, verifyUrl };
}

export async function isCodeValid({
	code,
	type,
	target,
}: {
	code: string;
	target: string;
	type: VerificationTypes;
}) {
	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let verification = await db
		.select({
			algorithm: schema.verifications.algorithm,
			charSet: schema.verifications.charSet,
			period: schema.verifications.period,
			secret: schema.verifications.secret,
		})
		.from(schema.verifications)
		.where(
			and(
				and(
					eq(schema.verifications.target, target),
					eq(schema.verifications.type, type),
				),
				or(
					gt(schema.verifications.expiresAt, new Date()),
					isNull(schema.verifications.expiresAt),
				),
			),
		)
		.get();
	if (!verification) return false;
	let result = await verifyTOTP({
		algorithm: verification.algorithm,
		charSet: verification.charSet,
		otp: code,
		period: verification.period,
		secret: verification.secret,
	});
	if (!result) return false;

	return true;
}

export async function validateRequest(
	env: Env,
	request: Request,
	body: FormData | URLSearchParams,
) {
	let submission = parseSubmission(body);

	let client = connectClientCf();
	let db = drizzle({ client, logger: false, schema });

	let superRefined = VerifyFormSchema.superRefine(async (data, ctx) => {
		let codeIsValid = await isCodeValid({
			code: data[codeQueryParam],
			target: data[targetQueryParam],
			type: data[typeQueryParam],
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

	switch (result.data[typeQueryParam]) {
		case 'onboarding': {
			return handleOnboardingVerification(env, {
				body,
				request,
				result: result.data,
			});
		}
	}
}
