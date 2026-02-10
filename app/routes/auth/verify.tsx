import { useForm } from '@conform-to/react/future';
import { Form, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { appContext, getContext } from '@/app/context';
import type { Route } from './+types/verify';
import { validateRequest } from './verify.server';

export const codeQueryParam = 'code';
export const targetQueryParam = 'target';
export const typeQueryParam = 'type';
export const redirectToQueryParam = 'redirectTo';

const types = ['onboarding'] as const;
const VerificationTypeSchema = z.enum(types);
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

export const VerifyFormSchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
});

export async function loader({ context, request }: Route.LoaderArgs) {
	let params = new URL(request.url).searchParams;
	if (!params.has(codeQueryParam)) {
		return { result: null };
	}

	let { env } = getContext(context, appContext);

	return validateRequest(env, request, params);
}

export async function action({ context, request }: Route.ActionArgs) {
	let formData = await request.formData();
	let { env } = getContext(context, appContext);
	return validateRequest(env, request, formData);
}

export default function Component({
	actionData,
	loaderData,
}: Route.ComponentProps) {
	let data = loaderData;
	let [searchParams] = useSearchParams();

	let { form, fields } = useForm(VerifyFormSchema, {
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
