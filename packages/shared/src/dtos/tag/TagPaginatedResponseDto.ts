import { type z } from 'zod';
import { PaginationResponseDtoSchema } from '../PaginationDto';
import { TagResponseDto } from './TagResponseDto';

export const TagPaginatedResponseDto = PaginationResponseDtoSchema(TagResponseDto);

export type TTagPaginatedResponseDto = z.infer<typeof TagPaginatedResponseDto>;
