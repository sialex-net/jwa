import { Input as BaseInput } from '@base-ui-components/react/input';
import * as React from 'react';
import { cn } from '@/app/utils/cn';

function Input({
	className,
	defaultValue,
	type = 'text',
	...props
}: React.ComponentProps<typeof BaseInput>) {
	let [inputValue, setInputValue] = React.useState(defaultValue);

	return (
		<BaseInput
			className={cn(
				'flex w-full rounded-md border border-gray-2 bg-gray-1/25 px-3 py-3 focus-visible:border-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-7 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid]:border-destructive-5 aria-[invalid]:ring-destructive-5 aria-[invalid]:focus-visible:border-background aria-[invalid]:focus-visible:ring-2 aria-[invalid]:focus-visible:ring-inset',
				className,
			)}
			onValueChange={(e) => setInputValue(e)}
			type={type}
			value={inputValue}
			{...props}
		/>
	);
}

export { Input };
