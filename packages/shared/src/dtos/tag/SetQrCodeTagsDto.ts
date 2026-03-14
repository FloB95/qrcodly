import { z } from 'zod';

export const SetQrCodeTagsDto = z.object({
	tagIds: z
		.array(z.uuid())
		.default([])
		.describe('Array of tag UUIDs to assign. Pass an empty array to remove all tags.'),
});

export type TSetQrCodeTagsDto = z.infer<typeof SetQrCodeTagsDto>;
