import fs from 'node:fs';
import { faker } from '@faker-js/faker';
import { drizzle } from 'drizzle-orm/libsql';
import { UniqueEnforcer } from 'enforce-unique';
import { getClientNode } from './clients/libsql-node';
import * as schema from './drizzle/schema';

let client = getClientNode();
let db = drizzle(client, { schema });

let uniqueUsernameEnforcer = new UniqueEnforcer();

function createUser() {
	let firstName = faker.person.firstName();
	let lastName = faker.person.lastName();

	let username = uniqueUsernameEnforcer
		.enforce(() => {
			return (
				faker.string.alphanumeric({ length: 2 }) +
				'_' +
				faker.internet.username({
					firstName: firstName.toLowerCase(),
					lastName: lastName.toLowerCase(),
				})
			);
		})
		.slice(0, 20)
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_');
	return {
		email: `${username}@example.com`,
		name: `${firstName} ${lastName}`,
		username,
	};
}

async function img({
	altText,
	filepath,
}: {
	altText?: string;
	filepath: string;
}) {
	return {
		altText,
		blob: await fs.promises.readFile(filepath),
		contentType: filepath.endsWith('.jpeg')
			? 'image/jpeg'
			: filepath.endsWith('.webp')
				? 'image/webp'
				: 'image/avif',
	};
}

async function seed() {
	console.log('Seeding database...');
	console.time(`Done`);

	console.time('Deleted existing users...');
	await db.delete(schema.users);
	console.timeEnd('Deleted existing users...');

	let totalUsers = 5;
	console.time(`Created ${totalUsers} new users...`);

	let userImages = await Promise.all(
		Array.from({ length: 10 }, (_, index) =>
			img({ filepath: `./seed-data/images/user/${index}.jpeg` }),
		),
	);

	let postImages = await Promise.all([
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/0.avif',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/1.avif',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/2.avif',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/3.avif',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/4.avif',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/5.avif',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/6.webp',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/7.webp',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/8.avif',
		}),
		img({
			altText: 'a poster from the John Wick universe',
			filepath: './seed-data/images/notes/9.avif',
		}),
	]);

	for (let index = 0; index < totalUsers; index++) {
		// TODO: maybe do error handling with catch

		let userResult = await db
			.insert(schema.users)
			.values(createUser())
			.returning()
			.get();

		await db.insert(schema.userImages).values({
			...userImages[index % 10],
			altText: `Avatar for ${userResult.username}`,
			userId: userResult.id,
		});

		let createdPosts = Array.from({
			length: faker.number.int({ max: 3, min: 1 }),
		}).map(() => ({
			content: faker.lorem.paragraphs(),
			title: faker.lorem.sentence(),
			userId: userResult.id,
		}));

		let postsResult = await db
			.insert(schema.posts)
			.values(createdPosts)
			.returning();

		for (let index = 0; index < postsResult.length; index++) {
			let postImagesSelection = Array.from({
				length: faker.number.int({ max: 3, min: 1 }),
			}).map(() => {
				let imgNumber = faker.number.int({ max: 9, min: 0 });
				return { ...postImages[imgNumber], postId: postsResult[index].id };
			});

			await db.insert(schema.postImages).values(postImagesSelection);
		}
	}
	console.timeEnd(`Created ${totalUsers} new users...`);

	console.timeEnd(`Done`);
}

seed()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(() => client.close());
