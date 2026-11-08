import { container, injectable } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { type SQL } from 'drizzle-orm';
import { ObjectStorage } from '@/core/storage/object.storage';
import { UnitOfWork } from '@/core/db/unit-of-work';
import StoredFileRepository from '../domain/repository/stored-file.repository';
import { STORED_FILE_OWNER_TYPES, type TStoredFile } from '../domain/entities/stored-file.entity';
import { STORED_FILE_ORPHAN_MAX_AGE_HOURS } from '../config/constants';

const BATCH_SIZE = 200;
/** Batches per reason and run; enough to keep up with the pending-upload cap across many users. */
const MAX_BATCHES = 25;

/**
 * Deletes stored files nobody needs any more: uploads that were never claimed, released files
 * whose retention period is over, and files whose owner vanished without releasing them. Each
 * reason is its own indexed query. Runs hourly.
 */
@injectable()
@CronJob()
export class CleanupStoredFilesCronJob extends AbstractCronJob {
	schedule = '20 * * * *';

	protected async execute(): Promise<void> {
		const { deleted, errors } = await this.sweep();
		this.logger.info('storedFile.sweep.complete', { storedFile: { deleted, errors } });
	}

	async sweep(now: Date = new Date()): Promise<{ deleted: number; errors: number }> {
		const repository = container.resolve(StoredFileRepository);
		const cutoff = new Date(now.getTime() - STORED_FILE_ORPHAN_MAX_AGE_HOURS * 60 * 60 * 1000);
		const totals = { deleted: 0, errors: 0 };

		// each reason is checked twice: once to find a batch, once more under a lock per file
		const sources: Array<{ find: () => Promise<TStoredFile[]>; still: SQL }> = [
			{
				find: () => repository.findUnclaimedBefore(cutoff, BATCH_SIZE),
				still: repository.unclaimedBefore(cutoff),
			},
			{
				find: () => repository.findPurgeDue(now, BATCH_SIZE),
				still: repository.purgeDue(now),
			},
			...STORED_FILE_OWNER_TYPES.map((ownerType) => ({
				find: () => repository.findOrphanedClaimed(ownerType, cutoff, BATCH_SIZE),
				still: repository.orphanedClaimed(ownerType, cutoff),
			})),
		];
		for (const source of sources) {
			await this.drain(source, repository, totals);
		}
		return totals;
	}

	private async drain(
		source: { find: () => Promise<TStoredFile[]>; still: SQL },
		repository: StoredFileRepository,
		totals: { deleted: number; errors: number },
	): Promise<void> {
		const storage = container.resolve(ObjectStorage);
		for (let batch = 0; batch < MAX_BATCHES; batch++) {
			const files = await source.find();
			const before = totals.deleted;
			for (const file of files) {
				try {
					// a save may have claimed the file since the batch was read; that save wins
					const removed = await UnitOfWork.run(async () => {
						const current = await repository.lockIfStill(file.fileKey, source.still);
						if (!current) return false;
						// the row goes first, still under the lock: when storage fails, the rollback
						// brings it back for the next run, and nothing locks after the object is gone
						await repository.delete(current);
						await storage.delete(current.fileKey);
						return true;
					});
					if (removed) totals.deleted++;
				} catch (error) {
					totals.errors++;
					this.logger.error('storedFile.sweep.error', {
						storedFile: { id: file.id, fileKey: file.fileKey },
						error: error as Error,
					});
				}
			}
			// a short batch is the last one; a batch without progress (only errors) would repeat forever
			if (files.length < BATCH_SIZE || totals.deleted === before) break;
		}
	}
}
