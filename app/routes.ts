import type { RouteConfig } from '@react-router/dev/routes';
import { index, prefix, route } from '@react-router/dev/routes';

export default [
	index('./routes/home.tsx'),
	route('login', './routes/login.tsx'),
	route('theme-switch', './routes/theme-switch.tsx'),
	route('users', './routes/users/users.tsx', [
		index('./routes/users/home.tsx'),
		...prefix(':username', [
			index('./routes/users/username.tsx'),
			...prefix('posts', [
				index('./routes/posts/home.tsx'),
				route(':postId', './routes/posts/post-id.tsx'),
				route(':postId/edit', './routes/posts/edit-post.tsx'),
			]),
		]),
	]),
	...prefix('resources', [
		route('user-images/:imageId', './routes/resources/user-images/imageId.tsx'),
	]),
	route('healthcheck', './routes/healthcheck.tsx'),
	route('*', './routes/catch-all.tsx'),
] satisfies RouteConfig;
