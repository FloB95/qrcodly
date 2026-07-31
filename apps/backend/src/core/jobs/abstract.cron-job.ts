import { container } from 'tsyringe';
import { Logger } from '../logging';
import { KeyCache } from '../cache';
import { cronDuration, cronRuns, safely } from '../metrics';

export abstract class AbstractCronJob {
	protected logger: Logger = container.resolve(Logger);
	get name(): string {
		return this.constructor.name;
	}
	abstract schedule: string;
	protected abstract execute(): Promise<void>;

	async start(): Promise<void> {
		const cache = container.resolve(KeyCache);
		const lockKey = `cron_lock:${this.name}`;
		const lockTtlSeconds = 600; // 10 minutes max lock duration

		// Acquire a distributed lock to prevent concurrent execution across instances
		const acquired = await cache.getClient().set(lockKey, '1', 'EX', lockTtlSeconds, 'NX');
		if (!acquired) {
			this.logger.debug(`Cron job ${this.name} skipped — already running on another instance`);
			safely(() => cronRuns.add(1, { job: this.name, outcome: 'skipped_locked' }));
			return;
		}

		this.logger.debug(`Starting cron job: ${this.name}`);
		const startedAt = Date.now();
		try {
			await this.execute();
			this.logger.info(`Cron job ${this.name} completed successfully.`);
			safely(() => cronRuns.add(1, { job: this.name, outcome: 'success' }));
		} catch (error) {
			this.logger.error(`Error in cron job ${this.name}:`, { error });
			safely(() => cronRuns.add(1, { job: this.name, outcome: 'failed' }));
		} finally {
			safely(() => cronDuration.record(Date.now() - startedAt, { job: this.name }));
			await cache.del(lockKey);
		}
	}
}
