import { Outlet } from 'react-router';
/** @knipIgnoreUnresolved */
import type { Route } from './+types/users';

export default function Component(_: Route.ComponentProps) {
	return <Outlet />;
}
