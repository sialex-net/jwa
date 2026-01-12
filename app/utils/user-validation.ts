import { z } from 'zod';

export const UsernameSchema = z
	.string({
		error: (iss) =>
			iss.input === undefined ? 'Username is required' : 'Not a string',
	})
	.min(3, { message: 'Username is too short' })
	.max(20, { message: 'Username is too long' })
	.regex(/^[a-zA-Z0-9_]+$/, {
		message: 'Username can only include letters, numbers, and underscores',
	})
	// users can type the username in any case, but we store it in lowercase
	.transform((value) => value.toLowerCase());

export const PasswordSchema = z
	.string({
		error: (iss) =>
			iss.input === undefined ? 'Password is required' : 'Not a string',
	})
	.min(6, { message: 'Password is too short' })
	.max(100, { message: 'Password is too long' });

export const EmailSchema = z
	.email({
		error: (iss) =>
			iss.input === undefined ? 'Email is required' : 'Invalid email address',
	})
	.min(3, { message: 'Email is too short' })
	.max(100, { message: 'Email is too long' })
	// users can type the email in any case, but we store it in lowercase
	.transform((value) => value.toLowerCase());
