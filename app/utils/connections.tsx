import { Form } from 'react-router';
import { z } from 'zod';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';

const GITHUB_PROVIDER_NAME = 'github';
// to add another provider, set their name here and add it to the providerNames below

const providerNames = [GITHUB_PROVIDER_NAME] as const;
export const ProviderNameSchema = z.enum(providerNames);
export type ProviderName = z.infer<typeof ProviderNameSchema>;

export const providerLabels: Record<ProviderName, string> = {
	[GITHUB_PROVIDER_NAME]: 'GitHub',
} as const;

const providerIcons: Record<ProviderName, React.ReactNode> = {
	[GITHUB_PROVIDER_NAME]: <Icon name="github-logo" />,
} as const;

export function ProviderConnectionForm({
	redirectTo,
	type,
	providerName,
}: {
	providerName: ProviderName;
	redirectTo?: null | string;
	type: 'Connect' | 'Login' | 'Signup';
}) {
	let label = providerLabels[providerName];
	let formAction = `/auth/${providerName}`;
	return (
		<Form
			action={formAction}
			className="flex items-center justify-center gap-2"
			method="POST"
		>
			{redirectTo ? (
				<input
					name="redirectTo"
					type="hidden"
					value={redirectTo}
				/>
			) : null}
			<Button
				className="w-full"
				type="submit"
			>
				<span className="inline-flex items-center gap-1.5">
					{providerIcons[providerName]}
					<span>
						{type} with {label}
					</span>
				</span>
			</Button>
		</Form>
	);
}
