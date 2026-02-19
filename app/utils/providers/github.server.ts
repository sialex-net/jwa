import { redirect } from 'react-router';
import { GitHubStrategy } from 'remix-auth-github';
import { z } from 'zod';
import type { AuthProvider } from './provider';

const GitHubUserSchema = z.object({ login: z.string() });

export class GitHubProvider implements AuthProvider {
	getAuthStrategy() {
		return new GitHubStrategy(
			{
				callbackURL: '/auth/github/callback',
				clientID: process.env.GITHUB_CLIENT_ID,
				clientSecret: process.env.GITHUB_CLIENT_SECRET,
			},
			async ({ profile }) => {
				let email = profile.emails[0].value.trim().toLowerCase();
				if (!email) {
					let logMessage = {
						description: 'Please add a verified email to your GitHub account.',
						title: 'No email found',
					};
					console.log(logMessage);
					throw redirect('/login');
				}
				let username = profile.displayName;
				let imageUrl = profile.photos[0].value;
				return {
					email,
					id: profile.id,
					imageUrl,
					name: profile.name.givenName,
					username,
				};
			},
		);
	}

	async resolveConnectionData(env: Env, providerId: string) {
		let response = await fetch(`https://api.github.com/user/${providerId}`, {
			headers: {
				Accept: 'application/vnd.github+json',
				Authorization: `token ${env.GITHUB_TOKEN}`,
				'User-Agent': 'sialex-net',
				'X-GitHub-Api-Version': '2022-11-28',
			},
		});
		let rawJson = await response.json();
		let result = GitHubUserSchema.safeParse(rawJson);
		return {
			displayName: result.success ? result.data.login : 'Unknown',
			link: result.success ? `https://github.com/${result.data.login}` : null,
		} as const;
	}
}
