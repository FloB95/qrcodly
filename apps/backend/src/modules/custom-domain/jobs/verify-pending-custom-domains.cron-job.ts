import { injectable, container } from 'tsyringe';
import { CronJob } from '@/core/decorators/cron-job.decorator';
import { AbstractCronJob } from '@/core/jobs/abstract.cron-job';
import { daysAgo } from '@/core/utils/date';
import CustomDomainRepository from '../domain/repository/custom-domain.repository';
import { VerifyCustomDomainUseCase } from '../useCase/verify-custom-domain.use-case';

// An abandoned setup would otherwise be polled forever; the manual check still works after this.
const MAX_DOMAIN_AGE_DAYS = 7;

/**
 * Runs the verification a user would otherwise have to trigger by hand.
 *
 * DNS records and Cloudflare certificates usually settle minutes after the user leaves the setup
 * screen. Without this sweep the domain stays pending until they come back and check its status.
 */
@injectable()
@CronJob()
export class VerifyPendingCustomDomainsCronJob extends AbstractCronJob {
	schedule = '*/15 * * * *';

	protected async execute(): Promise<void> {
		const customDomainRepository = container.resolve(CustomDomainRepository);
		const verifyCustomDomainUseCase = container.resolve(VerifyCustomDomainUseCase);

		const pending = await customDomainRepository.findPendingVerification(
			daysAgo(MAX_DOMAIN_AGE_DAYS),
		);
		if (pending.length === 0) {
			this.logger.debug('No pending custom domains to verify');
			return;
		}

		let activated = 0;
		let errors = 0;

		for (const customDomain of pending) {
			try {
				const verified = await verifyCustomDomainUseCase.execute(customDomain);
				if (verified.sslStatus === 'active') activated++;
			} catch (e) {
				const err = e instanceof Error ? e : new Error(String(e));
				errors++;
				// warn: the use case already logs Cloudflare failures as errors, and a misconfigured
				// domain would repeat this every run
				this.logger.warn('customDomain.verificationSweep.error', {
					customDomain: { id: customDomain.id, domain: customDomain.domain },
					error: { message: err.message, name: err.name },
				});
			}
		}

		this.logger.info('customDomain.verificationSweep.complete', {
			customDomain: { checked: pending.length, activated, errors },
		});
	}
}
