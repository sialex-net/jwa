import { invariantResponse } from '@epic-web/invariant';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { Form, Link } from 'react-router';
import { GeneralErrorBoundary } from '@/app/components/error-boundary';
import { Spacer } from '@/app/components/spacer';
import { Button } from '@/app/components/ui/button';
import { Icon } from '@/app/components/ui/icon';
import { getClientCf } from '@/app/middleware/libsql';
import { getUserImgSrc } from '@/app/utils/images';
import { useOptionalUser } from '@/app/utils/user';
import * as schema from '@/data/drizzle/schema';
import type { Route } from './+types/username';

export async function loader({ params }: Route.LoaderArgs) {
	let client = getClientCf();
	let db = drizzle(client, { logger: false, schema });

	let query = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.username, params.username))
		.leftJoin(schema.userImages, eq(schema.users.id, schema.userImages.userId))
		.get();

	client.close();

	invariantResponse(query, 'User not found', { status: 404 });

	return {
		data: {
			user: {
				email: query.users.email,
				id: query.users.id,
				image: query.user_images?.id,
				joined: query.users.createdAt,
				username: query.users.username,
			},
		},
	};
}

export default function Component({ loaderData }: Route.ComponentProps) {
	let { user } = loaderData.data;
	let userDisplayName = user.username ?? user.email;
	let loggedInUser = useOptionalUser();
	let isLoggedInUser = user.id === loggedInUser?.id;

	return (
		<div className="container mt-36 mb-48 flex flex-col items-center justify-center">
			<Spacer size="4xs" />
			<main>
				<div className="container flex flex-col items-center rounded-3xl bg-muted p-12">
					<div className="relative w-52">
						<div className="-top-40 absolute">
							<div className="relative">
								<img
									alt={userDisplayName}
									className="h-52 w-52 rounded-full object-cover"
									src={getUserImgSrc(user.image)}
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
							Joined {user.joined.toLocaleDateString('en-GB')}
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
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}

export const meta: Route.MetaFunction = ({ loaderData, params }) => {
	let displayName = loaderData?.data.user.username ?? params.username;
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
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No user with the username "{params.username}" exists</p>
				),
			}}
		/>
	);
}
