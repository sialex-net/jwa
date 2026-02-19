import type { RouteConfig } from '@react-router/dev/routes';
import { index, prefix, route } from '@react-router/dev/routes';

export default [
	index('./routes/home.tsx'),
	route('admin', './routes/admin.tsx'),
	route('login', './routes/auth/login.tsx'),
	route('logout', './routes/auth/logout.tsx'),
	route('signup', './routes/auth/signup.tsx'),
	route('onboarding', './routes/auth/onboarding.tsx'),
	route('onboarding/:provider', './routes/auth/onboarding/provider.tsx'),
	route('verify', './routes/auth/verify.tsx'),
	route('forgot-password', './routes/auth/forgot-password.tsx'),
	route('reset-password', './routes/auth/reset-password.tsx'),
	route('theme-switch', './routes/theme-switch.tsx'),
	...prefix('auth', [
		route(':provider', './routes/auth/provider/provider.ts', [
			route('callback', './routes/auth/provider/callback.ts'),
		]),
	]),
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
		route('password/create', './routes/settings/create-password.tsx'),
		route('avatar', './routes/settings/avatar.tsx'),
		route('change-email', './routes/settings/change-email.tsx'),
		route('connections', './routes/settings/connections.tsx'),
		route('two-factor', './routes/settings/two-factor/two-factor.tsx', [
			index('./routes/settings/two-factor/home.tsx'),
			route('disable', './routes/settings/two-factor/disable.tsx'),
			route('verify', './routes/settings/two-factor/verify.tsx'),
		]),
	]),
	...prefix('resources', [
		route('user-avatar/:imageId', './routes/resources/user-avatar/imageId.tsx'),
		route('post-images/:imageId', './routes/resources/post-images/imageId.tsx'),
		route('download-user-data', './routes/resources/download-user-data.tsx'),
	]),
	route('healthcheck', './routes/healthcheck.tsx'),
	route('*', './routes/catch-all.tsx'),
] satisfies RouteConfig;
