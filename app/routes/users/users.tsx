import { Outlet } from 'react-router';
import type { Route } from './+types/users';

export default function Component(_: Route.ComponentProps) {
	return <Outlet />;
}
