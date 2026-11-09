import { z } from 'zod';

export const HostedAssetUrlsRequestQueryDto = z.object({
	keys: z
		.string()
		.min(1)
		.max(2000)
		.describe('Comma-separated storage keys of images the caller uploaded'),
});
export type THostedAssetUrlsRequestQueryDto = z.infer<typeof HostedAssetUrlsRequestQueryDto>;

/** Public URL per storage key; keys that are not the caller's images are left out. */
export const HostedAssetUrlsResponseDto = z.record(z.string(), z.string());
export type THostedAssetUrlsResponseDto = z.infer<typeof HostedAssetUrlsResponseDto>;
