import { z } from 'zod';
import { TagSchema } from '../../schemas/Tag';

export const TagResponseDto = TagSchema.extend({
	qrCodeCount: z.number().optional(),
});
export type TTagResponseDto = z.infer<typeof TagResponseDto>;
