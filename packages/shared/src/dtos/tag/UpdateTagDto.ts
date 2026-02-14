import { type z } from 'zod';
import { TagSchema } from '../../schemas/Tag';

export const UpdateTagDto = TagSchema.pick({
	name: true,
	color: true,
}).partial();

export type TUpdateTagDto = z.infer<typeof UpdateTagDto>;
