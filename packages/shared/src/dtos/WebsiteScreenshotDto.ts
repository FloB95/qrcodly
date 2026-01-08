import { z } from 'zod';

export const WebsiteScreenshotDtoSchema = z.object({
	url: z.httpUrl(),
});

export type TWebsiteScreenshotDto = z.infer<typeof WebsiteScreenshotDtoSchema>;
