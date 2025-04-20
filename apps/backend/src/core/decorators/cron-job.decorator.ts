import { container, type InjectionToken } from 'tsyringe';
import { CronJobWorker } from '../jobs/cron-job-worker';
import { AbstractCronJob } from '../jobs/abstract.cron-job';

/**
 * Decorator to register a class as a cron job with the CronJobWorker.
 */
export function CronJob(): ClassDecorator {
	return (target) => {
		const jobInstance = container.resolve<AbstractCronJob>(
			target as unknown as InjectionToken<AbstractCronJob>,
		);
		if (!(jobInstance instanceof AbstractCronJob)) {
			throw new Error(`Class ${target.name} must extend AbstractCronJob to use "CronJob"`);
		}

		const cronJobWorker = container.resolve(CronJobWorker);
		cronJobWorker.registerJob(jobInstance);
	};
}
