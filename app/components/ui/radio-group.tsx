import { Radio as BaseRadio } from '@base-ui/react/radio';
import { RadioGroup as BaseRadioGroup } from '@base-ui/react/radio-group';
import { useControl } from '@conform-to/react/future';
import * as React from 'react';

type RadioGroupProps = {
	defaultValue?: string;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	items: Array<{ label: React.ReactNode; mode: string }>;
	name: string;
};

function RadioGroup({
	name,
	items,
	defaultValue,
	handleChange,
}: RadioGroupProps) {
	let radioGroupRef =
		React.useRef<React.ComponentRef<typeof BaseRadioGroup>>(null);
	let control = useControl({
		defaultValue,
		onFocus() {
			radioGroupRef.current?.focus();
		},
	});

	return (
		<>
			<input
				hidden
				name={name}
				onChange={(e) => handleChange(e)}
				ref={control.register}
			/>
			<BaseRadioGroup
				className="flex w-fit rounded-full ring ring-gray-1"
				onBlur={() => control.blur()}
				onValueChange={(value) =>
					typeof value === 'string' && control.change(value)
				}
				ref={radioGroupRef}
				value={control.value ?? ''}
			>
				{items.map((item) => {
					return (
						<div key={item.mode}>
							<BaseRadio.Root
								className="flex size-6 cursor-pointer items-center justify-center rounded-full text-gray-5 outline-primary-6 outline-offset-2 hover:text-gray-8 focus-visible:outline-2 data-[checked]:bg-primary-1/50 data-[checked]:text-gray-8 data-[checked]:ring data-[checked]:ring-gray-2"
								id={item.mode}
								value={item.mode}
							>
								<label
									className="flex"
									htmlFor={item.mode}
								>
									{item.label}
								</label>
							</BaseRadio.Root>
						</div>
					);
				})}
			</BaseRadioGroup>
		</>
	);
}

export { RadioGroup };
