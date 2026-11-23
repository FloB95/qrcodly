import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event/event.emitter';
import { UserCleanupFailedEvent } from '@/core/event/user-cleanup-failed.event';
import { withRetry } from './with-retry';

const BATCH_SIZE = 100;

/** Rides out short outages of Stripe, Cloudflare, the mail server or a database deadlock */
const RETRY = { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000, isRetryable: () => true };

function reportFailure(step: string, userId: string, error: unknown, failedItems?: number): void {
	container.resolve(Logger).error(`${step}.user-cleanup.failed`, {
		userId,
		failedItems,
		error: error as Error,
	});
	container.resolve(EventEmitter).emit(
		new UserCleanupFailedEvent({
			userId,
			step,
			failedItems,
			error: error instanceof Error ? error.message : String(error),
		}),
	);
}

/**
 * Runs one step of removing a deleted user's data, retrying it a few times. When it still fails,
 * it is logged and reported (`UserCleanupFailedEvent`) instead of thrown, because the other
 * modules clean up independently. Steps must be safe to run again.
 */
export async function cleanUpAfterUser(
	step: string,
	userId: string,
	run: () => Promise<void>,
): Promise<void> {
	try {
		await withRetry(run, RETRY);
	} catch (error) {
		reportFailure(step, userId, error);
	}
}

/**
 * Deletes everything of one kind a deleted user owned, item by item through the module's normal
 * delete use case, so a change to that use case applies here too. Reads batches until nothing is
 * left. Each item is retried a few times; one that still fails is skipped and the others are
 * deleted, then the failures are reported once (`UserCleanupFailedEvent`).
 *
 * @param findBatch up to `limit` of the user's remaining items; deleted ones must no longer appear
 */
export async function deleteAllOfUser<T extends { id: string }>(
	step: string,
	userId: string,
	findBatch: (limit: number) => Promise<T[]>,
	deleteOne: (item: T) => Promise<unknown>,
): Promise<void> {
	const logger = container.resolve(Logger);
	const failed = new Set<string>();
	let lastError: unknown;
	let deleted = 0;

	try {
		for (;;) {
			// failed items stay in the results, so ask for that many more
			const batch = (await withRetry(() => findBatch(BATCH_SIZE + failed.size), RETRY)).filter(
				(item) => !failed.has(item.id),
			);
			if (batch.length === 0) break;

			for (const item of batch) {
				try {
					await withRetry(() => deleteOne(item), RETRY);
					deleted++;
				} catch (error) {
					failed.add(item.id);
					lastError = error;
					logger.warn(`${step}.user-cleanup.item_failed`, {
						userId,
						id: item.id,
						error: error as Error,
					});
				}
			}
		}
	} catch (error) {
		reportFailure(step, userId, error, failed.size || undefined);
		return;
	}

	logger.info(`${step}.user-cleanup`, { userId, deleted, failed: failed.size });
	if (failed.size > 0) reportFailure(step, userId, lastError, failed.size);
}
