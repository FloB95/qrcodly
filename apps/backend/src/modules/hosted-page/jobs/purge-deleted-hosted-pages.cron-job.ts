import { container, injectable } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { env } from '@/core/config/env';
import { UnitOfWork } from '@/core/db/unit-of-work';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import HostedPageRepository from '../domain/repository/hosted-page.repository';

const BATCH_SIZE = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Removes deleted pages once their retention period is over. Their files were released on delete
 * and follow on their own purge date. A page still linked to a live short URL is refused by the
 * database and logged, never silently detached.
 */
@injectable()
@CronJob()
export class PurgeDeletedHostedPagesCronJob extends AbstractCronJob {
	schedule = '40 * * * *';

	protected async execute(): Promise<void> {
		const { purged, errors } = await this.purge();
		this.logger.info('hostedPage.purge.complete', { hostedPage: { purged, errors } });
	}

	async purge(now: Date = new Date()): Promise<{ purged: number; errors: number }> {
		const pageRepository = container.resolve(HostedPageRepository);
		const shortUrlRepository = container.resolve(ShortUrlRepository);
		const cutoff = new Date(now.getTime() - env.HOSTED_FILE_RETENTION_DAYS * DAY_MS);

		let purged = 0;
		let errors = 0;
		for (const page of await pageRepository.findDeletedBefore(cutoff, BATCH_SIZE)) {
			try {
				await UnitOfWork.run(async () => {
					await shortUrlRepository.detachDeletedPage(page.id);
					await pageRepository.hardDelete(page.id);
				});
				purged++;
			} catch (error) {
				errors++;
				this.logger.error('hostedPage.purge.error', {
					hostedPage: { id: page.id },
					error: error as Error,
				});
			}
		}
		return { purged, errors };
	}
}
