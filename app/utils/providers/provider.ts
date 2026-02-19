import type { Strategy } from 'remix-auth';

export type ProviderUser = {
	email: string;
	id: string;
	imageUrl?: string;
	name?: string;
	username?: string;
};

export interface AuthProvider {
	getAuthStrategy(): Strategy<ProviderUser, any>;
	resolveConnectionData(
		env: Env,
		providerId: string,
	): Promise<{
		displayName: string;
		link?: null | string;
	}>;
}
