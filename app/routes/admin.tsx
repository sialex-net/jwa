import { GeneralErrorBoundary } from '@/app/components/error-boundary';
import { requireUserWithRole } from '@/app/utils/permissions.server';
import { appContext, getContext } from '../context';
import type { Route } from './+types/admin';

export async function loader({ context, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	await requireUserWithRole(env, request, 'admin');
	return {};
}

export default function Component() {
	return (
		<div className="container pt-20 pb-32">
			<div className="flex flex-col items-center">
				<h1>Admin</h1>
			</div>
		</div>
	);
}
export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => (
					<p className="max-w-md">
						You do not have permission to access the requested resource
					</p>
				),
			}}
		/>
	);
}
