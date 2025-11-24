import type { RouteConfig } from '@react-router/dev/routes';
import { index, prefix, route } from '@react-router/dev/routes';

export default [
	index('./routes/home.tsx'),
	route('login', './routes/login.tsx'),
	route('theme-switch', './routes/theme-switch.tsx'),
	...prefix('users', [
		...prefix(':username', [
			index('./routes/username.tsx'),
			...prefix('posts', [
				index('./routes/posts/home.tsx'),
				route(':postId', './routes/posts/post-id.tsx'),
				route(':postId/edit', './routes/posts/edit-post.tsx'),
			]),
		]),
	]),
] satisfies RouteConfig;
