import { z } from 'zod';

export const SetShortUrlTagsDto = z.object({
	tagIds: z.array(z.uuid()).default([]),
});

export type TSetShortUrlTagsDto = z.infer<typeof SetShortUrlTagsDto>;
