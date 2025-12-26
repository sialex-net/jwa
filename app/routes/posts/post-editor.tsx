import type { FieldMetadata } from '@conform-to/react/future';
import { useForm } from '@conform-to/react/future';
import * as React from 'react';
import { Form } from 'react-router';
import { z } from 'zod';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/utils/cn';
import { getPostImgSrc } from '@/app/utils/images';
import type { Route } from './+types/edit-post';

const titleMinLength = 1;
const titleMaxLength = 100;
const contentMinLength = 1;
const contentMaxLength = 10000;

export const MAX_UPLOAD_SIZE = 1024 * 1024 * 3; // 3MB

const ImageFieldsetSchema = z.object({
	altText: z.string().optional(),
	file: z
		.instanceof(File)
		.optional()
		.refine((file) => {
			return !file || file.size <= MAX_UPLOAD_SIZE;
		}, 'File size must be less than 3MB'),
	id: z.string().optional(),
});

export type ImageFieldset = z.infer<typeof ImageFieldsetSchema>;

export const PostEditorSchema = z.object({
	content: z.string().min(contentMinLength).max(contentMaxLength),
	id: z.string().optional(),
	images: z
		.array(ImageFieldsetSchema)
		.max(5, { message: 'Maximum number of images exceeded' })
		.optional(),
	title: z.string().min(titleMinLength).max(titleMaxLength),
});

export function PostEditor({
	actionData,
	post,
}: {
	actionData?: Route.ComponentProps['actionData'];
	post?: Route.ComponentProps['loaderData']['data']['post'];
}) {
	let { form, fields, intent } = useForm({
		defaultValue: post,
		// Sync result of last submission
		lastResult: actionData?.result,
		// Reuse validation logic on client
		schema: PostEditorSchema,
	});

	let imageList = fields.images.getFieldList();

	return (
		<div className="absolute inset-0">
			<Form
				className="flex h-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden px-10 pt-12 pb-28"
				encType="multipart/form-data"
				method="POST"
				{...form.props}
			>
				{/*
					This hidden submit button is here to ensure that when the user hits
					"enter" on an input field, the primary form function is submitted
					rather than the first button in the form (which is delete/add image).
				*/}
				<button
					className="hidden"
					type="submit"
				/>
				{post ? (
					<input
						name="id"
						type="hidden"
						value={post.id}
					/>
				) : null}
				<div>
					<Label htmlFor={fields.title.id}>Title</Label>
					<Input
						aria-describedby={
							!fields.title.valid
								? fields.title.errorId
								: fields.title.descriptionId
						}
						aria-invalid={!fields.title.valid ? true : undefined}
						autoFocus={true}
						defaultValue={fields.title.defaultValue}
						id={fields.title.id}
						name={fields.title.name}
						type="text"
					/>
				</div>
				<div
					aria-hidden={true}
					className="sr-only"
					id={fields.title.descriptionId}
				>
					Please enter a title
				</div>
				<div
					aria-hidden={true}
					id={fields.title.errorId}
				>
					{fields.title.errors}
				</div>
				<div>
					<Label htmlFor={fields.content.id}>Content</Label>
					<textarea
						defaultValue={fields.content.defaultValue}
						id={fields.content.id}
						name={fields.content.name}
					></textarea>
				</div>
				<div>{fields.content.errors}</div>
				<div>
					<Label>Images</Label>
					<ul className="flex flex-col gap-y-4">
						{imageList.map((imageMeta, index) => {
							return (
								<li key={imageMeta.key}>
									<button
										className="cursor-pointer"
										name={fields.images.name}
										onClick={() => intent.remove({ index, name: 'images' })}
										type="button"
									>
										<span aria-hidden>
											<Icon name="cross-1" />
										</span>{' '}
										<span className="sr-only">Remove image {index + 1}</span>
									</button>
									<ImageChooser meta={imageMeta} />
								</li>
							);
						})}
					</ul>
				</div>
				{imageList.length < 5 ? (
					<Button
						className="mt-3"
						onClick={() => intent.insert({ name: 'images' })}
					>
						<span aria-hidden>
							<Icon name="plus">Image</Icon>
						</span>{' '}
						<span className="sr-only">Add image</span>
					</Button>
				) : null}

				<Button type="submit">Submit</Button>
			</Form>
		</div>
	);
}

function ImageChooser({ meta }: { meta: FieldMetadata<ImageFieldset> }) {
	let fields = meta.getFieldset();
	let existingImage = Boolean(fields.id.defaultValue);
	let [previewImage, setPreviewImage] = React.useState<null | string>(
		fields.id.defaultValue ? getPostImgSrc(fields.id.defaultValue) : null,
	);
	let [altText, setAltText] = React.useState(fields.altText.defaultValue ?? '');

	return (
		<fieldset>
			<div className="flex gap-3">
				<div className="w-32">
					<div className="relative size-32">
						<label
							className={cn('group absolute size-32 rounded-lg', {
								'bg-accent opacity-40 focus-within:opacity-100 hover:opacity-100':
									!previewImage,
								'cursor-pointer focus-within:ring-2': !existingImage,
							})}
							htmlFor={fields.file.id}
						>
							{previewImage ? (
								<div className="relative">
									{existingImage && !previewImage.startsWith('data:') ? (
										<img
											alt={altText ?? ''}
											className="size-32 rounded-lg object-cover"
											height={512}
											src={previewImage}
											width={512}
										/>
									) : (
										<img
											alt={altText ?? ''}
											className="size-32 rounded-lg object-cover"
											src={previewImage}
										/>
									)}
									{existingImage ? null : (
										<div className="-top-0.5 -right-0.5 pointer-events-none absolute rotate-12 rounded-sm bg-secondary px-2 py-1 text-secondary-foreground text-xs shadow-md">
											new
										</div>
									)}
								</div>
							) : (
								<div className="flex size-32 items-center justify-center rounded-lg border border-muted-foreground text-4xl text-muted-foreground">
									<Icon name="plus" />
								</div>
							)}
							{existingImage ? (
								<input
									defaultValue={fields.id.defaultValue}
									id={fields.file.id}
									key={fields.id.key}
									name={fields.id.name}
									type="hidden"
								/>
							) : null}
							<input
								accept="image/*"
								aria-label="Image"
								className="absolute top-0 left-0 z-0 size-32 cursor-pointer opacity-0"
								defaultValue={fields.file.defaultValue}
								id={fields.file.id}
								key={fields.file.key}
								name={fields.file.name}
								onChange={(event) => {
									let file = event.target.files?.[0];

									if (file) {
										let reader = new FileReader();
										reader.onloadend = () => {
											setPreviewImage(reader.result as string);
										};
										reader.readAsDataURL(file);
									} else {
										setPreviewImage(null);
									}
								}}
								type="file"
							/>
						</label>
					</div>
					<div className="min-h-[32px] px-4 pt-1 pb-3">
						<ErrorList
							errors={fields.file.errors}
							id={fields.file.errorId}
						/>
					</div>
				</div>
				<div className="flex-1">
					<Label htmlFor={fields.altText.id}>Alt Text</Label>
					<textarea
						defaultValue={fields.altText.defaultValue}
						id={fields.altText.id}
						key={fields.altText.key}
						name={fields.altText.name}
						onChange={(e) => setAltText(e.currentTarget.value)}
					/>
					<div className="min-h-[32px] px-4 pt-1 pb-3">
						<ErrorList
							errors={fields.altText.errors}
							id={fields.altText.errorId}
						/>
					</div>
				</div>
			</div>
			<div className="min-h-[32px] px-4 pt-1 pb-3">
				<ErrorList
					errors={meta.errors}
					id={meta.errorId}
				/>
			</div>
		</fieldset>
	);
}

type ListOfErrors = Array<null | string | undefined> | null | undefined;

function ErrorList({ id, errors }: { errors?: ListOfErrors; id?: string }) {
	let errorsToRender = errors?.filter(Boolean);
	if (!errorsToRender?.length) return null;
	return (
		<ul
			className="flex flex-col gap-1"
			id={id}
		>
			{errorsToRender.map((e) => (
				<li
					className="text-[10px] text-foreground-destructive"
					key={e}
				>
					{e}
				</li>
			))}
		</ul>
	);
}
