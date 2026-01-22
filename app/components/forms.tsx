type ListOfErrors = Array<null | string | undefined> | null | undefined;

export function ErrorList({
	id,
	errors,
}: {
	errors?: ListOfErrors;
	id?: string;
}) {
	let errorsToRender = errors?.filter(Boolean);
	if (!errorsToRender?.length) return null;
	return (
		<ul
			className="flex flex-col gap-1"
			id={id}
		>
			{errorsToRender.map((e) => (
				<li
					className="text-xs"
					key={e}
				>
					{e}
				</li>
			))}
		</ul>
	);
}
