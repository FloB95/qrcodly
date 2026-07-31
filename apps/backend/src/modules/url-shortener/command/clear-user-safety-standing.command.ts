import { AbstractCommand } from '@/core/command/abstract.command';
import { inject, injectable } from 'tsyringe';
import { UrlSafetyEscalationService } from '../service/url-safety-escalation.service';

/**
 * Resets a user's warn→ban ladder and lifts the ban.
 *
 * The counterpart to the automatic escalation: since the ban is enforced by a cron-driven system
 * with no admin UI, an operator needs a supported way to reverse it after reviewing a case.
 */
@injectable()
export default class ClearUserSafetyStandingCommand extends AbstractCommand {
	constructor(
		@inject(UrlSafetyEscalationService)
		private readonly escalationService: UrlSafetyEscalationService,
	) {
		super();
	}

	protected initialize(): void {
		this.command
			.name('url-safety:clear-standing')
			.description("Reset a user's URL-safety offence history and lift their ban")
			.requiredOption('-u, --user-id <id>', 'The Clerk user id');
	}

	protected async execute(options: Record<string, unknown>): Promise<void> {
		const userId = String(options.userId);
		await this.escalationService.clearStanding(userId);
		console.log(`Cleared URL-safety standing and lifted any ban for "${userId}".`);
	}
}
