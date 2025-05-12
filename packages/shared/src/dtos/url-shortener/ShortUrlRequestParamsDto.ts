import { z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';

export const GetShortUrlRequestQueryDto = ShortUrlSchema.pick({
	shortCode: true,
});
export type TGetShortUrlRequestQueryDto = z.infer<typeof GetShortUrlRequestQueryDto>;
