import type { RouteConfig } from '@react-router/dev/routes';
import { index, prefix, route } from '@react-router/dev/routes';

export default [
	index('./routes/home.tsx'),
	route('admin', './routes/admin.tsx'),
	route('login', './routes/auth/login.tsx'),
	route('logout', './routes/auth/logout.tsx'),
	route('signup', './routes/auth/signup.tsx'),
	route('onboarding', './routes/auth/onboarding.tsx'),
	route('theme-switch', './routes/theme-switch.tsx'),
	route('users', './routes/users/users.tsx', [
		index('./routes/users/home.tsx'),
		...prefix(':username', [
			index('./routes/users/username.tsx'),
			route('posts', './routes/posts/posts.tsx', [
				index('./routes/posts/home.tsx'),
				route(':postId', './routes/posts/post-id.tsx'),
				route(':postId/edit', './routes/posts/edit-post.tsx'),
				route('new', './routes/posts/new-post.tsx'),
			]),
		]),
	]),
	route('settings', './routes/settings/settings.tsx', [
		index('./routes/settings/home.tsx'),
		route('password', './routes/settings/password.tsx'),
		route('avatar', './routes/settings/avatar.tsx'),
	]),
	...prefix('resources', [
		route('user-avatar/:imageId', './routes/resources/user-avatar/imageId.tsx'),
		route('post-images/:imageId', './routes/resources/post-images/imageId.tsx'),
		route('download-user-data', './routes/resources/download-user-data.tsx'),
	]),
	route('healthcheck', './routes/healthcheck.tsx'),
	route('*', './routes/catch-all.tsx'),
] satisfies RouteConfig;
