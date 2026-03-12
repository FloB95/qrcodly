import { type z } from 'zod';
import { ShortUrlWithCustomDomainResponseDto } from './ShortUrlResponseDto';
import { PaginationResponseDtoSchema } from '../PaginationDto';

export const ShortUrlWithCustomDomainPaginatedResponseDto = PaginationResponseDtoSchema(
	ShortUrlWithCustomDomainResponseDto,
).describe('Short URL With Custom Domain Paginated Response');

export type TShortUrlWithCustomDomainPaginatedResponseDto = z.infer<
	typeof ShortUrlWithCustomDomainPaginatedResponseDto
>;
