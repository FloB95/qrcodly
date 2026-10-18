import { container } from 'tsyringe';
import { Logger } from '../logging';
import { KeyCache } from '../cache';
import { cronDuration, cronRuns, safely } from '../metrics';
import { randomString } from '@/utils/general';

const LOCK_TTL_MS = 10 * 60 * 1000;
// Hold the lock past the tick, so a slightly late replica can't run the same slot again
const MIN_LOCK_HOLD_MS = 55 * 1000;

// Only touch the lock while it is still ours
const EXTEND_IF_OWNER_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
	return redis.call("pexpire", KEYS[1], ARGV[2])
else
	return 0
end
`;
const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
	return redis.call("del", KEYS[1])
else
	return 0
end
`;

export abstract class AbstractCronJob {
	protected logger: Logger = container.resolve(Logger);
	get name(): string {
		return this.constructor.name;
	}
	abstract schedule: string;
	protected abstract execute(): Promise<void>;

	async start(): Promise<void> {
		const client = container.resolve(KeyCache).getClient();
		const lockKey = `cron_lock:${this.name}`;
		const token = randomString(16);

		// Acquire a distributed lock to prevent concurrent execution across instances
		let acquired: string | null;
		try {
			acquired = await client.set(lockKey, token, 'PX', LOCK_TTL_MS, 'NX');
		} catch (error) {
			// Without Redis we can't know if another instance runs it; jobs catch up next run
			this.logger.error(`Cron job ${this.name} skipped — lock unavailable`, { error });
			safely(() => cronRuns.add(1, { job: this.name, outcome: 'skipped_no_lock' }));
			return;
		}

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
			await this.releaseLock(lockKey, token, Date.now() - startedAt);
		}
	}

	private async releaseLock(lockKey: string, token: string, heldMs: number): Promise<void> {
		try {
			// Redis EVAL (atomic Lua script), not JS eval()
			if (heldMs < MIN_LOCK_HOLD_MS) {
				await container
					.resolve(KeyCache)
					.getClient()
					.eval(EXTEND_IF_OWNER_SCRIPT, 1, lockKey, token, MIN_LOCK_HOLD_MS - heldMs);
			} else {
				await container
					.resolve(KeyCache)
					.getClient()
					.eval(RELEASE_IF_OWNER_SCRIPT, 1, lockKey, token);
			}
		} catch (error) {
			// expires on its own after LOCK_TTL_MS
			this.logger.warn(`Cron job ${this.name} could not release its lock`, { error });
		}
	}
}
