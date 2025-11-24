import { cva } from 'cva';
import type * as React from 'react';
import { cn } from '@/app/utils/cn';

const labelVariants = cva({
	base: 'font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
});

function Label({ className, ...props }: React.ComponentProps<'label'>) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: .
		<label
			className={cn(labelVariants(), className)}
			{...props}
		/>
	);
}

export { Label };
