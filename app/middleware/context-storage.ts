import { createContextStorageMiddleware } from 'remix-utils/middleware/context-storage';

const [contextStorageMiddleware, getContext, _getRequest] =
	createContextStorageMiddleware();

export { contextStorageMiddleware, getContext };
