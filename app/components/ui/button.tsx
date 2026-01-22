import { mergeProps } from '@base-ui/react';
import { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'cva';
import { cva } from 'cva';
import { cn } from '@/app/utils/cn';

const buttonVariants = cva({
	base: 'inline-flex items-center justify-center rounded-md font-medium text-sm transition-colors focus-visible:border-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-7 focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50',
	defaultVariants: {
		size: 'default',
		variant: 'primary',
	},
	variants: {
		size: {
			default: 'px-4 py-4',
			icon: 'size-10',
			lg: 'h-11 px-8',
			pill: 'px-12 py-3 leading-3',
			sm: 'h-9 px-3',
			wide: 'px-24 py-5',
		},
		variant: {
			destructive:
				'border border-destructive-7 bg-destructive-2 hover:border-destructive-8 hover:bg-destructive-4 focus-visible:ring-destructive-7',
			ghost: 'hover:bg-blue-4',
			link: 'text-primary-5 underline-offset-4 hover:underline',
			outline:
				'border border-blue-7 bg-background text-blue-12 hover:border-blue-8 hover:bg-blue-4',
			primary:
				'border border-primary-6 bg-primary-2 hover:border-primary-8 hover:bg-primary-5',
			secondary:
				'border border-secondary-7 bg-secondary-3 hover:border-secondary-8 hover:bg-secondary-4 focus-visible:ring-secondary-7',
		},
	},
});

interface ButtonProps
	extends useRender.ComponentProps<'button'>,
		VariantProps<typeof buttonVariants> {}

function Button({ className, render, size, variant, ...props }: ButtonProps) {
	let defaultProps: useRender.ElementProps<'button'> = {
		className: cn(buttonVariants({ className, size, variant })),
		type: 'button',
	};

	let element = useRender({
		defaultTagName: 'button',
		props: mergeProps<'button'>(defaultProps, props),
		render,
	});

	return element;
}

export { Button };
