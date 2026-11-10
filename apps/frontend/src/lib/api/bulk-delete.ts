import { BULK_DELETE_MAX_ITEMS, type TBulkDeleteResponseDto } from '@shared/schemas';
import { apiRequest } from '@/lib/utils';

export type TBulkDeletePath = 'qr-code' | 'config-template' | 'short-url';

/** Deletes the given IDs; selections larger than the API limit go in several requests. */
export async function bulkDelete(
	path: TBulkDeletePath,
	ids: string[],
	token: string | null,
): Promise<TBulkDeleteResponseDto> {
	let deleted = 0;
	const failed: string[] = [];
	for (let start = 0; start < ids.length; start += BULK_DELETE_MAX_ITEMS) {
		const result = await apiRequest<TBulkDeleteResponseDto>(`/${path}/bulk-delete`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			body: JSON.stringify({ ids: ids.slice(start, start + BULK_DELETE_MAX_ITEMS) }),
		});
		deleted += result.deleted;
		failed.push(...result.failed);
	}
	return { deleted, failed };
}
