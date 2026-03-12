import { type z } from 'zod';
import { ShortUrlSchema } from '../../schemas/ShortUrl';
import { CustomDomainResponseDto } from '../custom-domain/response/custom-domain.dto';
import { TagResponseDto } from '../tag/TagResponseDto';

/**
 * Schema for the Short URL Response DTO.
 */
export const ShortUrlResponseDto = ShortUrlSchema;
export type TShortUrlResponseDto = z.infer<typeof ShortUrlResponseDto>;

export const ShortUrlWithCustomDomainResponseDto = ShortUrlSchema.omit({
	customDomainId: true,
}).extend({
	customDomain: CustomDomainResponseDto.nullable(),
	tags: TagResponseDto.array().default([]),
});
export type TShortUrlWithCustomDomainResponseDto = z.infer<
	typeof ShortUrlWithCustomDomainResponseDto
>;
