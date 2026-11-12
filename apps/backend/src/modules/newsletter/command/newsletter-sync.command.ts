import { AbstractCommand } from '@/core/command/abstract.command';
import { inject, injectable } from 'tsyringe';
import { NewsletterReconciliationService } from '../service/newsletter-reconciliation.service';

/**
 * Runs the newsletter reconciliation now; used once for the initial backfill.
 *
 * Local: `pnpm cli newsletter-sync --dry-run`; in the backend pod (no pnpm in the image):
 * `node build/src/cli.js newsletter-sync --dry-run`.
 * `--allow-mass-delete` lifts the deletion limit after the numbers were checked with a dry run.
 */
@injectable()
export default class NewsletterSyncCommand extends AbstractCommand {
	constructor(
		@inject(NewsletterReconciliationService)
		private readonly reconciliation: NewsletterReconciliationService,
	) {
		super();
	}

	protected initialize(): void {
		this.command
			.name('newsletter-sync')
			.description('Sync all Clerk accounts into the listmonk newsletter list')
			.option('--dry-run', 'Only count what would change', false)
			.option(
				'--allow-mass-delete',
				'Delete subscribers even when more accounts look deleted than the limit allows',
				false,
			);
	}

	protected async execute(options: Record<string, unknown>): Promise<void> {
		const dryRun = options.dryRun === true;
		const summary = await this.reconciliation.run({
			dryRun,
			allowMassDelete: options.allowMassDelete === true,
		});

		// AbstractCommand exits with 1 on a throw; it would overwrite process.exitCode with 0
		if (!summary) throw new Error('listmonk is not configured (LISTMONK_*), nothing was synced.');

		console.log(dryRun ? 'Dry run, nothing was changed:' : 'Done:');
		console.table(summary);
	}
}
