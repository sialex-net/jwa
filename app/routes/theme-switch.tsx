import { parseSubmission, report, useForm } from '@conform-to/react/future';
import { invariantResponse } from '@epic-web/invariant';
import * as React from 'react';
import { data, useFetcher, useFetchers } from 'react-router';
import { z } from 'zod';
import { Icon } from '../components/ui/icon';
import { RadioGroup } from '../components/ui/radio-group';
import { useHints, useOptionalHints } from '../utils/client-hints';
import { useOptionalRequestInfo, useRequestInfo } from '../utils/request-info';
import { setTheme, type Theme } from '../utils/theme.server';
import type { Route } from './+types/theme-switch';

const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark']),
});

export async function action({ request }: Route.ActionArgs) {
	let formData = await request.formData();
	let submission = parseSubmission(formData);
	let result = ThemeFormSchema.safeParse(submission.payload);

	invariantResponse(result.success, 'Invalid theme received');

	let { theme } = result.data;

	let responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	};
	return data({ result: report(submission) }, responseInit);
}

export function ThemeSwitch({
	userPreference,
}: {
	userPreference?: null | Theme;
}) {
	let fetcher = useFetcher<typeof action>();

	let { form } = useForm(ThemeFormSchema, {
		id: 'theme-switch',
		lastResult: fetcher.data?.result,
	});

	let optimisticMode = useOptimisticThemeMode();
	let mode = optimisticMode ?? userPreference ?? 'system';

	let [selectedValue, setSelectedValue] = React.useState(mode);

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		let { value } = e.target;
		if (value === 'dark' || value === 'light' || value === 'system') {
			setSelectedValue(value);
			fetcher.submit(
				{ theme: value },
				{ action: '/theme-switch', method: 'POST' },
			);
		}
		return;
	}

	const themes: {
		label: React.ReactNode;
		mode: string;
	}[] = [
		{
			label: (
				<Icon
					className="size-4"
					name="mobile"
				>
					<span className="sr-only">System</span>
				</Icon>
			),
			mode: 'system',
		},
		{
			label: (
				<Icon
					className="size-4"
					name="sun"
				>
					<span className="sr-only">Light</span>
				</Icon>
			),
			mode: 'light',
		},
		{
			label: (
				<Icon
					className="size-4"
					name="moon"
				>
					<span className="sr-only">Dark</span>
				</Icon>
			),
			mode: 'dark',
		},
	];

	return (
		<fetcher.Form
			action="/theme-switch"
			className="h-8"
			method="POST"
			{...form.props}
		>
			<RadioGroup
				defaultValue={selectedValue}
				handleChange={handleChange}
				items={themes}
				name="theme"
			/>
		</fetcher.Form>
	);
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	let fetchers = useFetchers();
	let themeFetcher = fetchers.find((f) => f.formAction === '/theme-switch');

	if (themeFetcher?.formData) {
		let submission = parseSubmission(themeFetcher.formData);
		let result = ThemeFormSchema.safeParse(submission.payload);

		if (result.success) {
			return result.data.theme;
		}
	}
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	let hints = useHints();
	let requestInfo = useRequestInfo();
	let optimisticMode = useOptimisticThemeMode();
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode;
	}
	return requestInfo.userPrefs.theme ?? hints.theme;
}

export function useOptionalTheme() {
	let optionalHints = useOptionalHints();
	let optionalRequestInfo = useOptionalRequestInfo();
	let optimisticMode = useOptimisticThemeMode();
	if (optimisticMode) {
		return optimisticMode === 'system' ? optionalHints?.theme : optimisticMode;
	}
	return optionalRequestInfo?.userPrefs.theme ?? optionalHints?.theme;
}
