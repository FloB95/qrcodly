import { type ZodSchema, z } from 'zod';

/**
 * Schema for the Pagination Response DTO.
 * @param dataSchema The schema for the data.
 * @returns The schema for the pagination response.
 */
export const PaginationResponseDtoSchema = <T>(dataSchema: ZodSchema<T>) =>
	z.object({
		page: z.number(),
		limit: z.number(),
		total: z.number(),
		data: z.array(dataSchema),
	});

/**
 * Interface for the Pagination DTO.
 * @template T The type of data in the pagination response.
 */
export interface IPaginationDto<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}
