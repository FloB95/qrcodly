import { container } from 'tsyringe';
import { Logger } from '../logging';

export abstract class AbstractCronJob {
	protected logger: Logger = container.resolve(Logger);
	get name(): string {
		return this.constructor.name;
	}
	abstract schedule: string;
	protected abstract execute(): Promise<void>;

	async start(): Promise<void> {
		this.logger.debug(`Starting cron job: ${this.name}`);
		try {
			await this.execute();
			this.logger.info(`Cron job ${this.name} completed successfully.`);
		} catch (error) {
			this.logger.error(`Error in cron job ${this.name}:`, error as Error);
		}
	}
}
