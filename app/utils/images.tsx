import userFallback from '@/app/assets/images/user.jpeg';

export function getUserImgSrc(imageId?: null | string) {
	return imageId ? `/resources/user-images/${imageId}` : userFallback;
}
