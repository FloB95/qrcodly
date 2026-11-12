import { inject, singleton } from 'tsyringe';
import { type TNewsletterContentLocale } from '@shared/schemas';
import { Logger } from '@/core/logging';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { ListmonkClient, type IListmonkSubscriber } from '@/libs/listmonk';
import { CLERK_PAGE_SIZE, DELETION_LIMIT_SHARE, MIN_DELETION_LIMIT } from '../config/constants';
import { storedLocale } from '../domain/newsletter-locale';
import { fromClerkUser } from '../domain/newsletter-user';
import { type INewsletterUser } from '../domain/newsletter-user.interface';
import {
	type INewsletterOrphan,
	type INewsletterReconciliationOptions,
	type TNewsletterReconciliationSummary,
	type TNewsletterSyncOutcome,
} from '../domain/newsletter-sync.interface';
import { blockedAddressOnly, clerkUserIdOf, isOnList } from '../domain/subscriber-match';
import { type ISubscriberMatch } from '../domain/subscriber-match.interface';
import { NewsletterSyncAbortedError } from '../error/newsletter-sync-aborted.error';
import { NewsletterSyncService } from './newsletter-sync.service';

/** The account keeps its existing subscriber */
const KEPT_SUBSCRIBER_OUTCOMES: TNewsletterSyncOutcome[] = ['linked', 'email_updated', 'unchanged'];

/**
 * Reconciles listmonk against all Clerk accounts, catching what failed webhooks missed (they are
 * fire-and-forget). Runs nightly and, through the CLI, as the initial backfill.
 *
 * Creates missing subscribers (with the sign-up page's language), links existing ones by email,
 * follows changed emails and takes banned accounts off the list. Never changes the language of an
 * existing subscriber. Deletes subscribers whose account is gone, but only after a complete Clerk
 * listing and a 404 for that account: deleting a subscriber that holds an opt-out would put the
 * person back on the list. Aborts with a NewsletterSyncAbortedError before changing anything when
 * the Clerk listing is not usable or far more accounts look deleted than a normal night has, e.g.
 * when the Clerk key does not belong to this listmonk.
 */
@singleton()
export class NewsletterReconciliationService {
	constructor(
		@inject(ListmonkClient) private readonly listmonk: ListmonkClient,
		@inject(ClerkUserInfoService) private readonly clerkUsers: ClerkUserInfoService,
		@inject(NewsletterSyncService) private readonly sync: NewsletterSyncService,
		@inject(Logger) private readonly logger: Logger,
	) {}

	/** Returns null when listmonk is not configured */
	async run({
		dryRun,
		allowMassDelete = false,
	}: INewsletterReconciliationOptions): Promise<TNewsletterReconciliationSummary | null> {
		if (!this.listmonk.isEnabled()) {
			this.logger.info('newsletter.sync.disabled');
			return null;
		}

		const subscribers = await this.listmonk.listAllSubscribers();

		let users: INewsletterUser[];
		try {
			users = await this.listAllUsers();
		} catch (error) {
			this.logger.error('newsletter.sync.aborted', { error, reason: 'clerk_list_failed' });
			throw new NewsletterSyncAbortedError('clerk_list_failed');
		}
		if (users.length === 0) {
			this.logger.error('newsletter.sync.aborted', { reason: 'no_clerk_users' });
			throw new NewsletterSyncAbortedError('no_clerk_users');
		}

		const orphans = this.findOrphans(subscribers, users);
		const deletionLimit = Math.max(
			MIN_DELETION_LIMIT,
			Math.ceil(subscribers.length * DELETION_LIMIT_SHARE),
		);
		if (orphans.length > deletionLimit && !allowMassDelete) {
			this.logger.error('newsletter.sync.aborted', {
				reason: 'too_many_deletions',
				newsletterSync: {
					orphans: orphans.length,
					deletionLimit,
					clerkUsers: users.length,
					subscribers: subscribers.length,
				},
			});
			throw new NewsletterSyncAbortedError('too_many_deletions');
		}

		const summary: TNewsletterReconciliationSummary = {
			clerkUsers: users.length,
			subscribers: subscribers.length,
			created: 0,
			linked: 0,
			email_updated: 0,
			unchanged: 0,
			missing: 0,
			blocked: 0,
			conflict: 0,
			skipped: 0,
			errors: 0,
			deleted: 0,
			anonymized: 0,
			kept: 0,
			banned_unsubscribed: 0,
			recipients_de: 0,
			recipients_en: 0,
		};

		await this.syncUsers(users, subscribers, dryRun, summary);
		await this.deleteOrphans(orphans, dryRun, summary);

		this.logger.info('newsletter.sync.completed', { newsletterSync: { dryRun, ...summary } });
		return summary;
	}

	/** Every Clerk user, oldest first. Throws rather than returning a partial list. */
	private async listAllUsers(): Promise<INewsletterUser[]> {
		const users: INewsletterUser[] = [];
		for (let offset = 0; ; offset += CLERK_PAGE_SIZE) {
			const page = await this.clerkUsers.listUsers({ limit: CLERK_PAGE_SIZE, offset });
			users.push(...page.map(fromClerkUser));
			if (page.length < CLERK_PAGE_SIZE) return users;
		}
	}

	/** Linked subscribers whose account is not in the listing; blocklisted ones are reduced, not deleted */
	private findOrphans(
		subscribers: IListmonkSubscriber[],
		users: INewsletterUser[],
	): INewsletterOrphan[] {
		const clerkUserIds = new Set(users.map((user) => user.id));
		const orphans: INewsletterOrphan[] = [];
		for (const subscriber of subscribers) {
			const clerkUserId = clerkUserIdOf(subscriber);
			if (clerkUserId && !clerkUserIds.has(clerkUserId)) {
				orphans.push({ subscriber, clerkUserId });
			}
		}
		return orphans;
	}

	private async syncUsers(
		users: INewsletterUser[],
		subscribers: IListmonkSubscriber[],
		dryRun: boolean,
		summary: TNewsletterReconciliationSummary,
	): Promise<void> {
		const byClerkId = new Map<string, IListmonkSubscriber>();
		const byEmail = new Map<string, IListmonkSubscriber>();
		for (const subscriber of subscribers) {
			const clerkUserId = clerkUserIdOf(subscriber);
			if (clerkUserId && !byClerkId.has(clerkUserId)) byClerkId.set(clerkUserId, subscriber);
			byEmail.set(subscriber.email.toLowerCase(), subscriber);
		}

		for (const user of users) {
			try {
				const match = {
					byClerkId: byClerkId.get(user.id) ?? null,
					byEmail: (user.email && byEmail.get(user.email)) || null,
				};
				if (
					user.banned &&
					(await this.sync.unsubscribe(match.byClerkId, dryRun)) === 'unsubscribed'
				) {
					summary.banned_unsubscribed++;
				}
				const outcome = await this.sync.apply(user, match, {
					source: 'sync',
					create: true,
					dryRun,
				});
				summary[outcome]++;
				const locale = this.recipientLocale(user, match, outcome);
				if (locale) summary[`recipients_${locale}`]++;
			} catch (error) {
				summary.errors++;
				this.logger.error('newsletter.sync.user-failed', { error, userId: user.id });
			}
		}
	}

	/** The language the account gets mail in after the run; null when it gets none */
	private recipientLocale(
		user: INewsletterUser,
		{ byClerkId, byEmail }: ISubscriberMatch,
		outcome: TNewsletterSyncOutcome,
	): TNewsletterContentLocale | null {
		if (outcome === 'created') return user.locale;
		// on a conflict the linked subscriber keeps getting mail at the old address
		const subscriber = KEPT_SUBSCRIBER_OUTCOMES.includes(outcome)
			? (byClerkId ?? byEmail)
			: outcome === 'conflict'
				? byClerkId
				: null;
		if (!subscriber || !isOnList(subscriber, this.listmonk.getListId())) return null;
		return storedLocale(subscriber.attribs);
	}

	private async deleteOrphans(
		orphans: INewsletterOrphan[],
		dryRun: boolean,
		summary: TNewsletterReconciliationSummary,
	): Promise<void> {
		for (const { subscriber, clerkUserId } of orphans) {
			try {
				// the paged listing can miss an account when another one is deleted meanwhile
				if (await this.userExists(clerkUserId)) {
					summary.kept++;
					continue;
				}
				if (subscriber.status === 'blocklisted') {
					if (!dryRun) {
						await this.listmonk.replaceSubscriber(subscriber.id, blockedAddressOnly(subscriber));
					}
					summary.anonymized++;
					continue;
				}
				if (!dryRun) await this.listmonk.deleteSubscriber(subscriber.id);
				summary.deleted++;
			} catch (error) {
				summary.errors++;
				this.logger.error('newsletter.sync.delete-failed', { error, userId: clerkUserId });
			}
		}
	}

	/** false only when Clerk answers 404; any other failure throws */
	private async userExists(userId: string): Promise<boolean> {
		try {
			await this.clerkUsers.getUser(userId);
			return true;
		} catch (error) {
			if ((error as { status?: unknown }).status === 404) return false;
			throw error;
		}
	}
}
