import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { Form, redirect, useSearchParams } from 'react-router';
import { safeRedirect } from 'remix-utils/safe-redirect';
import { z } from 'zod';
import {
	getSessionExpirationDate,
	login,
	requireAnonymous,
	userIdKey,
} from '@/app/utils/auth.server';
import { getSessionStorage } from '@/app/utils/sessions.server';
import { ErrorList } from '../components/forms';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { appContext, getContext } from '../context';
import type { Route } from './+types/login';

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	await requireAnonymous(env, request);
	return {};
}

const LoginSchema = z.object({
	email: z.email({
		error: (iss) =>
			iss.input === undefined ? 'Email is required' : 'Invalid email address',
	}),
	password: z.string('Password is required'),
	redirectTo: z.string().optional(),
	remember: z.preprocess((v) => v === 'on', z.boolean()),
});

export async function action({ context, request }: Route.ActionArgs) {
	let { env } = getContext(context, appContext);
	await requireAnonymous(env, request);
	let formData = await request.formData();
	let submission = parseSubmission(formData);
	let transformed = LoginSchema.transform(async (data, ctx) => {
		let user = await login(data);
		if (!user) {
			ctx.addIssue({
				code: 'custom',
				message: 'Invalid username or password',
			});
			return z.NEVER;
		}

		return { ...data, user };
	});

	let result = await transformed.safeParseAsync(submission.payload);

	if (!result.success) {
		return {
			result: report(submission, {
				error: {
					issues: result.error.issues,
				},
				hideFields: ['password'],
			}),
		};
	}

	let { redirectTo, remember, user } = result.data;

	let cookieSession = await getSessionStorage(env).getSession(
		request.headers.get('cookie'),
	);

	cookieSession.set(userIdKey, user.id);

	return redirect(safeRedirect(redirectTo), {
		headers: {
			'set-cookie': await getSessionStorage(env).commitSession(cookieSession, {
				expires: remember ? getSessionExpirationDate() : undefined,
			}),
		},
	});
}

export default function Component({ actionData }: Route.ComponentProps) {
	let [searchParams] = useSearchParams();
	let redirectTo = searchParams.get('redirectTo');

	let { form, fields } = useForm(LoginSchema, {
		defaultValue: {
			email: '',
			password: '',
			redirectTo,
			remember: false,
		},
		// Sync result of last submission
		lastResult: actionData?.result,
	});

	return (
		<Form
			className="mx-2 flex flex-col gap-y-2 pt-8"
			method="POST"
			{...form.props}
		>
			<div className="relative">
				<Input
					aria-describedby={
						!fields.email.valid
							? fields.email.errorId
							: fields.email.descriptionId
					}
					aria-invalid={!fields.email.valid ? true : undefined}
					className="peer pt-7 leading-5"
					defaultValue={fields.email.defaultValue}
					id={fields.email.id}
					name={fields.email.name}
					placeholder=""
					type="email"
				/>
				<Label
					className="peer-placeholder-shown:-translate-y-1/2 absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.email.id}
				>
					Email
				</Label>
				<div
					aria-hidden={true}
					className="sr-only"
					id={fields.email.descriptionId}
				>
					Please enter your email
				</div>
				<div
					aria-hidden={true}
					className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
					id={fields.email.errorId}
				>
					{fields.email.errors}
				</div>
			</div>
			<div className="relative">
				<Input
					aria-describedby={
						!fields.password.valid
							? fields.password.errorId
							: fields.password.descriptionId
					}
					aria-invalid={!fields.password.valid ? true : undefined}
					className="peer pt-7 leading-5"
					defaultValue={fields.password.defaultValue}
					id={fields.password.id}
					name={fields.password.name}
					placeholder=""
					type="password"
				/>
				<Label
					className="peer-placeholder-shown:-translate-y-1/2 absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
					htmlFor={fields.password.id}
				>
					Password
				</Label>
				<div
					aria-hidden={true}
					className="sr-only"
					id={fields.password.descriptionId}
				>
					Please enter your password
				</div>
				<div
					aria-hidden={true}
					className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
					id={fields.password.errorId}
				>
					{fields.password.errors}
				</div>
			</div>
			<div className="flex gap-x-3">
				<Checkbox
					aria-labelledby={fields.remember.descriptionId}
					className="peer"
					defaultChecked={fields.remember.defaultChecked}
					id={fields.remember.id}
					name={fields.remember.name}
				/>
				<Label
					className="self-center font-light text-gray-4 hover:text-foreground peer-hover:text-foreground"
					htmlFor={fields.remember.id}
				>
					Remember me? (14 days)
				</Label>
				<div
					aria-hidden={true}
					className="sr-only"
					id={fields.remember.descriptionId}
				>
					Please check if you want your login to be remembered for 14 days
				</div>
			</div>

			<input
				defaultValue={fields.redirectTo.defaultValue}
				id={fields.redirectTo.id}
				key={fields.redirectTo.key}
				name={fields.redirectTo.name}
				type="hidden"
			/>

			<ErrorList
				errors={form.errors}
				id={form.errorId}
			/>

			<div className="py-2">
				<Button
					aria-label="Log in"
					className="w-full text-lg"
					size="default"
					type="submit"
				>
					Login
				</Button>
			</div>
		</Form>
	);
}

export function meta(_: Route.MetaArgs) {
	return [
		{ title: 'Login' },
		/* biome-ignore-start assist/source/useSortedKeys: .*/
		{ name: 'description', content: 'Login' },
		/* biome-ignore-end assist/source/useSortedKeys: .*/
	];
}
