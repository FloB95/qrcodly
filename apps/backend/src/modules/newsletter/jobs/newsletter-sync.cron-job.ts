import { container, injectable } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { NewsletterReconciliationService } from '../service/newsletter-reconciliation.service';

/** Nightly reconciliation of listmonk against all Clerk accounts; an aborted run fails the job */
@injectable()
@CronJob()
export class NewsletterSyncCronJob extends AbstractCronJob {
	schedule = '30 4 * * *';

	protected async execute(): Promise<void> {
		await container.resolve(NewsletterReconciliationService).run({ dryRun: false });
	}
}
