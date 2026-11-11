import { container } from 'tsyringe';
import { type TBulkDeleteResponseDto } from '@shared/schemas';
import { CustomApiError } from '@/core/error/http/custom-api.error';
import { Logger } from '@/core/logging';

/**
 * Deletes the items one after another through the normal single-item path (ownership check and
 * use case). A failed item is reported and logged; the others are still deleted.
 */
export async function deleteEach(
	entity: string,
	ids: string[],
	deleteOne: (id: string) => Promise<void>,
): Promise<TBulkDeleteResponseDto> {
	const logger = container.resolve(Logger);
	let deleted = 0;
	const failed: string[] = [];

	for (const id of new Set(ids)) {
		try {
			await deleteOne(id);
			deleted++;
		} catch (error) {
			failed.push(id);
			// not found or not owned is expected now and then; anything else is a fault on our side
			if (error instanceof CustomApiError && error.statusCode < 500) {
				logger.warn(`${entity}.bulkDelete.skipped`, { id, reason: error.message });
			} else {
				logger.error(`error.${entity}.bulkDelete`, { id, error: error as Error });
			}
		}
	}

	logger.info(`${entity}.bulkDelete`, { requested: ids.length, deleted, failed: failed.length });
	return { deleted, failed };
}
