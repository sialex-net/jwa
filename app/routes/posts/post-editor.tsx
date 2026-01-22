import type { FieldMetadata } from '@conform-to/react/future';
import { useForm } from '@conform-to/react/future';
import * as React from 'react';
import { Form } from 'react-router';
import { z } from 'zod';
import { ErrorList } from '@/app/components/forms';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/utils/cn';
import { getPostImgSrc } from '@/app/utils/images';
import type { Route } from './+types/edit-post';

const titleMaxLength = 100;
const contentMaxLength = 10_000;
const altTextMaxLength = 100;

export const MAX_UPLOAD_SIZE = 1024 * 1024 * 3; // 3MB

const ImageFieldsetSchema = z.object({
	altText: z
		.string({
			error: (iss) => (iss.input === undefined ? 'Alt text is required' : null),
		})
		.max(altTextMaxLength, {
			error: `Alt text cannot exceed ${altTextMaxLength} characters`,
		})
		.optional(),
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
	content: z
		.string({
			error: (iss) => (iss.input === undefined ? 'Content is required' : null),
		})
		.max(contentMaxLength, {
			error: `Content cannot exceed ${contentMaxLength} characters`,
		}),
	id: z.string().optional(),
	images: z
		.array(ImageFieldsetSchema)
		.max(5, { message: 'Maximum number of images exceeded' })
		.optional(),
	title: z
		.string({
			error: (iss) => (iss.input === undefined ? 'Title is required' : null),
		})
		.max(titleMaxLength, {
			error: `Title cannot exceed ${titleMaxLength} characters`,
		}),
});

export function PostEditor({
	actionData,
	post,
}: {
	actionData?: Route.ComponentProps['actionData'];
	post?: Route.ComponentProps['loaderData']['post'];
}) {
	let { form, fields, intent } = useForm(PostEditorSchema, {
		defaultValue: post,
		lastResult: actionData?.result,
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
				<div className="relative">
					<Input
						aria-describedby={
							!fields.title.valid
								? fields.title.errorId
								: fields.title.descriptionId
						}
						aria-invalid={!fields.title.valid ? true : undefined}
						autoFocus={true}
						className="peer pt-7 leading-5"
						defaultValue={fields.title.defaultValue}
						id={fields.title.id}
						name={fields.title.name}
						type="text"
					/>
					<Label
						className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
						htmlFor={fields.title.id}
					>
						Title
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.title.descriptionId}
					>
						Please enter a title
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.title.errorId}
					>
						{fields.title.errors}
					</div>
				</div>
				<div
					aria-hidden={true}
					aria-invalid={!fields.content.valid ? true : undefined}
					className="relative rounded-md border border-gray-2 bg-gray-1/25 py-5 pt-7 has-focus-visible:border-primary-2 has-focus-visible:outline-hidden has-focus-visible:ring-2 has-focus-visible:ring-primary-7 has-focus-visible:ring-inset aria-[invalid]:border-destructive-5 aria-[invalid]:ring-destructive-5 aria-[invalid]:has-focus-visible:border-primary-2 aria-[invalid]:has-focus-visible:ring-2 aria-[invalid]:has-focus-visible:ring-inset"
				>
					<Textarea
						aria-describedby={
							!fields.content.valid
								? fields.content.errorId
								: fields.content.descriptionId
						}
						aria-invalid={!fields.content.valid ? true : undefined}
						className="peer scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-7 h-min-h-[3.75rem] leading-5 focus-visible:outline-hidden"
						defaultValue={fields.content.defaultValue}
						id={fields.content.id}
						name={fields.content.name}
					/>
					<Label
						className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
						htmlFor={fields.content.id}
					>
						Content
					</Label>
					<div
						aria-hidden={true}
						className="sr-only"
						id={fields.content.descriptionId}
					>
						Please enter some content
					</div>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.content.errorId}
					>
						{fields.content.errors}
					</div>
				</div>
				<div>
					<Label className="text-gray-7">Images</Label>
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
										<div className="pointer-events-none absolute -top-0.5 -right-0.5 rotate-12 rounded-sm bg-secondary px-2 py-1 text-secondary-foreground text-xs shadow-md">
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
									id={fields.id.id}
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
				<div
					aria-hidden={true}
					aria-invalid={!fields.altText.valid ? true : undefined}
					className="relative w-full rounded-md border border-gray-2 bg-gray-1/25 py-5 pt-7 has-focus-visible:border-primary-2 has-focus-visible:outline-hidden has-focus-visible:ring-2 has-focus-visible:ring-primary-7 has-focus-visible:ring-inset aria-[invalid]:border-destructive-5 aria-[invalid]:ring-destructive-5 aria-[invalid]:has-focus-visible:border-primary-2 aria-[invalid]:has-focus-visible:ring-2 aria-[invalid]:has-focus-visible:ring-inset"
				>
					<Textarea
						className="peer scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-7 h-full leading-5 focus-visible:outline-hidden"
						defaultValue={fields.altText.defaultValue}
						id={fields.altText.id}
						key={fields.altText.key}
						name={fields.altText.name}
						onChange={(e) => setAltText(e.currentTarget.value)}
					/>
					<Label
						className="absolute top-2 left-4 font-light text-gray-4 text-xs peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-lg peer-hover:text-gray-7 peer-focus-visible:pb-7.5 peer-focus-visible:text-foreground peer-focus-visible:text-xs peer-focus-visible:hover:text-foreground"
						htmlFor={fields.altText.id}
					>
						Alt Text
					</Label>
					<div
						aria-hidden={true}
						className="absolute right-4 bottom-1 font-light text-destructive-5 text-xs"
						id={fields.altText.errorId}
					>
						{fields.altText.errors}
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
