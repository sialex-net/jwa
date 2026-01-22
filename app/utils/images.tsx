import userFallback from '@/app/assets/images/user.jpeg';

export function getUserImgSrc(imageId?: null | string) {
	return imageId ? `/resources/user-avatar/${imageId}` : userFallback;
}

export function getPostImgSrc(imageId: string) {
	return `/resources/post-images/${imageId}`;
}
