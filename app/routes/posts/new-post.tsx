import { invariantResponse } from '@epic-web/invariant';
import { appContext, getContext } from '@/app/context';
import { requireUser } from '@/app/utils/auth.server';
import type { Route } from './+types/new-post';
import { PostEditor } from './post-editor';

export async function loader({ context, params, request }: Route.LoaderArgs) {
	let { env } = getContext(context, appContext);
	let user = await requireUser(env, request);
	invariantResponse(user.username === params.username, 'Not authorized', {
		status: 403,
	});
	return {};
}

export { action } from './post-editor.server';

export default PostEditor;
