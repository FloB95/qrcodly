import { z } from 'zod';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const TAG_NAME_MAX_LENGTH = 32;

export const TagSchema = AbstractEntitySchema.extend({
	name: z.string().min(1).max(TAG_NAME_MAX_LENGTH),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	createdBy: z.string(),
});

export type TTag = z.infer<typeof TagSchema>;
