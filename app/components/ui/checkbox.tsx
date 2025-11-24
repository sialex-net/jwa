import { Checkbox as BaseCheckbox } from '@base-ui-components/react/checkbox';
import { useControl } from '@conform-to/react/future';
import * as React from 'react';
import { cn } from '@/app/utils/cn';
import { Icon } from './icon';

type CheckboxProps = {
	className?: string;
	defaultChecked?: boolean;
	id: string;
	name: string;
	value?: string;
};

function Checkbox({
	className,
	name,
	value,
	defaultChecked,
	id,
	...props
}: CheckboxProps) {
	let checkboxRef =
		React.useRef<React.ComponentRef<typeof BaseCheckbox.Root>>(null);
	let control = useControl({
		defaultChecked,
		onFocus() {
			checkboxRef.current?.focus();
		},
		value,
	});

	return (
		<>
			<input
				hidden={true}
				id={id}
				name={name}
				ref={control.register}
				type="checkbox"
			/>
			<BaseCheckbox.Root
				checked={control.checked}
				className={cn(
					'flex size-5 items-center justify-center rounded-sm border border-gray-2 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-7 focus-visible:ring-inset data-[checked]:bg-gray-1/50',
					className,
				)}
				onBlur={() => control.blur()}
				onCheckedChange={(checked) => control.change(checked)}
				ref={checkboxRef}
				{...props}
			>
				<BaseCheckbox.Indicator className="flex text-gray-50 data-[unchecked]:hidden">
					<Icon
						className="size-3"
						name="check"
					/>
				</BaseCheckbox.Indicator>
			</BaseCheckbox.Root>
		</>
	);
}

export { Checkbox };
