import { z } from 'zod';

export const SetShortUrlTagsDto = z.object({
	tagIds: z
		.array(z.uuid())
		.default([])
		.describe('Array of tag UUIDs to assign. Pass an empty array to remove all tags.'),
});

export type TSetShortUrlTagsDto = z.infer<typeof SetShortUrlTagsDto>;
