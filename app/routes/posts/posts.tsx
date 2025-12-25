import { Outlet } from 'react-router';
import type { Route } from './+types/posts';

export default function Component(_: Route.ComponentProps) {
	return <Outlet />;
}
