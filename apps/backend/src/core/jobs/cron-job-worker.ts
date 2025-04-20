import { inject, singleton } from 'tsyringe';
import { type ScheduledTask } from 'node-cron';
import { type AbstractCronJob } from './abstract.cron-job';
import { Logger } from '../logging';
import { OnShutdown } from '../decorators/on-shutdown.decorator';
import cron from 'node-cron';
import { DEFAULT_TIME_ZONE } from '../config/constants';

interface ICronJob {
	jobClass: AbstractCronJob;
	task: ScheduledTask;
}

@singleton()
export class CronJobWorker {
	private jobs: ICronJob[];

	constructor(@inject(Logger) private logger: Logger) {
		this.jobs = [];
	}

	public start(): void {
		this.logger.info('🗓  Cron worker started...');
		this.jobs.forEach((job) => job.task.start());
	}

	public registerJob(job: AbstractCronJob): void {
		this.logger.debug(`🗓  Registering cron job: ${job.name}`);
		const scheduledTask = cron.schedule(
			job.schedule,
			() => {
				void job.start();
			},
			{
				scheduled: false,
				timezone: DEFAULT_TIME_ZONE,
			},
		);

		this.jobs.push({
			jobClass: job,
			task: scheduledTask,
		});
	}

	public stop(): void {
		this.logger.info('Stopping cron jobs...');
		this.jobs.forEach((job) => {
			this.logger.info(`Stopping job ${job.jobClass.name}...`);
			job.task.stop();
		});
		this.logger.info('All cron jobs stopped.');
	}

	@OnShutdown()
	onShutdown() {
		this.stop();
	}
}
