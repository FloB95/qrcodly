import { type TNewsletterSyncAbortReason } from '../domain/newsletter-sync.interface';

/** The reconciliation stopped before it changed anything in listmonk */
export class NewsletterSyncAbortedError extends Error {
	constructor(readonly reason: TNewsletterSyncAbortReason) {
		super(`Newsletter sync aborted (${reason}), nothing was changed`);
		this.name = 'NewsletterSyncAbortedError';
	}
}
