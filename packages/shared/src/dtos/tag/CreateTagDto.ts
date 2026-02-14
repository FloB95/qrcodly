import { type z } from 'zod';
import { TagSchema } from '../../schemas/Tag';

export const CreateTagDto = TagSchema.pick({
	name: true,
	color: true,
});

export type TCreateTagDto = z.infer<typeof CreateTagDto>;
