import { z } from 'zod';

export const SetQrCodeTagsDto = z.object({
	tagIds: z.array(z.uuid()).default([]),
});

export type TSetQrCodeTagsDto = z.infer<typeof SetQrCodeTagsDto>;
