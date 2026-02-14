import { type z } from 'zod';
import { PaginationResponseDtoSchema } from '../PaginationDto';
import { TagResponseDto } from './TagResponseDto';
import { type TTag } from '../../schemas/Tag';

export const TagPaginatedResponseDto = PaginationResponseDtoSchema<TTag>(TagResponseDto);

export type TTagPaginatedResponseDto = z.infer<typeof TagPaginatedResponseDto>;
