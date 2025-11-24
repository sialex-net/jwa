import type { RouteConfig } from '@react-router/dev/routes';
import { index, route } from '@react-router/dev/routes';

export default [
	index('./routes/home.tsx'),
	route('login', './routes/login.tsx'),
	route('theme-switch', './routes/theme-switch.tsx'),
] satisfies RouteConfig;
