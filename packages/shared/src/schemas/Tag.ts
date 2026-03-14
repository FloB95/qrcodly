import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const TAG_NAME_MAX_LENGTH = 32;

export const TagSchema = AbstractEntitySchema.extend({
	name: z.string().min(1).max(TAG_NAME_MAX_LENGTH).describe('Tag display name (max 32 characters)'),
	color: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.describe('Tag color as hex code (e.g. "#FF5733")'),
	createdBy: z.string().describe('User ID of the tag owner'),
});

export type TTag = z.infer<typeof TagSchema>;
