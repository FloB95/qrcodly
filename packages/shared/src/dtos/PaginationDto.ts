import { type ZodSchema, z } from 'zod';

/**
 * Schema for the Pagination Response DTO.
 * @param dataSchema The schema for the data.
 * @returns The schema for the pagination response.
 */
export const PaginationResponseDtoSchema = <T>(dataSchema: ZodSchema<T>) =>
	z.object({
		page: z.number().describe('Current page number (1-based)'),
		limit: z.number().describe('Maximum number of items per page'),
		total: z.number().describe('Total number of items matching the query across all pages'),
		data: z.array(dataSchema).describe('Array of items for the current page'),
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
