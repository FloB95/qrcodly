import { AbstractCommand } from '@/core/command/abstract.command';
import { container, injectable } from 'tsyringe';
import { env } from '@/core/config/env';
import { ShortUrlSafetyRecheckCronJob } from '../jobs/short-url-safety-recheck.cron-job';

/**
 * Runs the safety re-check pass on demand.
 *
 * The scheduled job only fires at 05:00, which makes both testing and incident response awkward —
 * after fixing a false positive or flipping the mode you want the next pass now, not tomorrow.
 * Goes through the job's own `start()`, so the distributed lock and all logging behave identically
 * to a scheduled run.
 */
@injectable()
export default class RecheckShortUrlSafetyCommand extends AbstractCommand {
	protected initialize(): void {
		this.command
			.name('url-safety:recheck')
			.description('Run the short URL safety re-check pass immediately');
	}

	protected async execute(): Promise<void> {
		if (!env.GOOGLE_WEB_RISK_API_KEY) {
			console.error(
				'GOOGLE_WEB_RISK_API_KEY is not set — every lookup would return "unknown" and nothing would be checked.',
			);
			process.exitCode = 1;
			return;
		}

		console.log(`Running safety re-check in "${env.URL_SAFETY_RECHECK_MODE}" mode...`);
		if (env.URL_SAFETY_RECHECK_MODE === 'shadow') {
			console.log(
				'Shadow mode: findings are recorded but nothing is disabled, nobody is mailed and the ' +
					'offence ladder does not move. Set URL_SAFETY_RECHECK_MODE=enforce to act on them.',
			);
		}

		await container.resolve(ShortUrlSafetyRecheckCronJob).start();
		console.log('Done. See the url_safety.recheck.completed log line for the tally.');
	}
}
