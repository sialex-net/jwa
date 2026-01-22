import { createSingletonMiddleware } from 'remix-utils/middleware/singleton';
import { getClientCf as getClient } from '@/data/clients/libsql-cf';
import { appContext } from '../context';
import { getContext } from './context-storage';

const [libsqlMiddleware, getClientFromContext] = createSingletonMiddleware({
	instantiator() {
		return getClient(getContext().get(appContext).env);
	},
});

function getClientCf() {
	let context = getContext();
	return getClientFromContext(context);
}

export function connectClientCf() {
	let client = getClientCf();
	if (client.closed) {
		client.reconnect();
	}
	return client;
}

export { libsqlMiddleware };
