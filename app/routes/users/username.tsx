import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, Link } from 'react-router';
import { GeneralErrorBoundary } from '@/app/components/error-boundary';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { connectClientCf } from '@/app/middleware/libsql';
import { getUserImgSrc } from '@/app/utils/images';
import { useOptionalUser } from '@/app/utils/user';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/username';

export async function loader({ params }: Route.LoaderArgs) {
	let client = connectClientCf();
	let db = drizzle(client, { logger: false, schema });

	let query = await db
		.select({
			userAvatar: { id: schema.userAvatar.id },
			users: {
				createdAt: schema.users.createdAt,
				id: schema.users.id,
				username: schema.users.username,
			},
		})
		.from(schema.users)
		.where(eq(schema.users.username, params.username))
		.leftJoin(schema.userAvatar, eq(schema.users.id, schema.userAvatar.userId))
		.get();

	client.close();

	invariantResponse(query, `username ${params.username} does not exist`, {
		status: 404,
	});

	return {
		user: {
			avatar: query.userAvatar,
			...query.users,
		},
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	let { user } = loaderData;
	let userDisplayName = user.username;
	let loggedInUser = useOptionalUser();
	let isLoggedInUser = user.id === loggedInUser?.id;

	return (
		<div className="container mt-36 mb-48 flex flex-col items-center justify-center">
			<Spacer size="4xs" />
			<main>
				<div className="container flex flex-col items-center rounded-3xl bg-muted p-12">
					<div className="relative w-52">
						<div className="absolute -top-40">
							<div className="relative">
								<img
									alt={userDisplayName}
									className="h-52 w-52 rounded-full object-cover"
									src={getUserImgSrc(user.avatar?.id)}
								/>
							</div>
						</div>
					</div>

					<Spacer size="sm" />

					<div className="flex flex-col items-center">
						<div className="flex flex-wrap items-center justify-center gap-4">
							<h1 className="text-center text-h2">{userDisplayName}</h1>
						</div>
						<p className="mt-2 text-center text-muted-foreground">
							Joined {user.createdAt.toLocaleDateString('en-GB')}
						</p>
						{isLoggedInUser ? (
							<Form
								action="/logout"
								className="mt-3"
								method="POST"
							>
								<Button
									size="pill"
									type="submit"
									variant="link"
								>
									<Icon
										className="scale-125 max-md:scale-150"
										name="exit"
									>
										Logout
									</Icon>
								</Button>
							</Form>
						) : null}
						<div className="mt-10 flex gap-4">
							{isLoggedInUser ? (
								<>
									<Button
										render={(props) => (
											<Link
												prefetch="intent"
												to="posts"
												{...props}
											>
												My posts
											</Link>
										)}
									/>
									<Button
										render={(props) => (
											<Link
												prefetch="intent"
												to="/settings"
												{...props}
											>
												Edit settings
											</Link>
										)}
									/>
								</>
							) : (
								<Button
									render={(props) => (
										<Link
											prefetch="intent"
											to="posts"
											{...props}
										>
											{userDisplayName}'s posts
										</Link>
									)}
								/>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

export const meta: Route.MetaFunction = ({ loaderData, params }) => {
	let displayName = loaderData?.user.username ?? params.username;
	return [
		{ title: `${displayName} | John Wicki` },
		/* biome-ignore-start assist/source/useSortedKeys: .*/
		{
			name: 'description',
			content: `Profile of ${displayName} on John Wicki`,
		},
		/* biome-ignore-end assist/source/useSortedKeys: .*/
	];
};

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
