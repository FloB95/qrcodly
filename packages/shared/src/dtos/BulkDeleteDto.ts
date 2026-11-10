import { z } from 'zod';

// one request deletes at most one full table page; the dashboard sends larger selections in parts
export const BULK_DELETE_MAX_ITEMS = 100;

export const BulkDeleteDto = z.object({
	ids: z
		.array(z.string().min(1).max(64))
		.min(1)
		.max(BULK_DELETE_MAX_ITEMS)
		.describe('IDs of the items to delete (short codes for short URLs), at most 100'),
});

export const BulkDeleteResponseDto = z.object({
	deleted: z.number().int().describe('Number of items deleted'),
	failed: z
		.array(z.string())
		.describe('IDs that were not found, not owned or could not be deleted; the rest still were'),
});

export type TBulkDeleteDto = z.infer<typeof BulkDeleteDto>;
export type TBulkDeleteResponseDto = z.infer<typeof BulkDeleteResponseDto>;
