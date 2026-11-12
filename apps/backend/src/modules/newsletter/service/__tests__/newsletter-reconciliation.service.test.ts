import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type { User } from '@clerk/fastify';
import { type Logger } from '@/core/logging';
import { type ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { type ListmonkClient, type IListmonkSubscriber } from '@/libs/listmonk';
import { NewsletterSyncAbortedError } from '../../error/newsletter-sync-aborted.error';
import { NewsletterReconciliationService } from '../newsletter-reconciliation.service';
import { NewsletterSyncService } from '../newsletter-sync.service';

const clerkUser = (id: string, overrides: Record<string, unknown> = {}) =>
	({
		id,
		firstName: null,
		locale: null,
		banned: false,
		privateMetadata: {},
		primaryEmailAddress: {
			emailAddress: `${id}@example.com`,
			verification: { status: 'verified' },
		},
		...overrides,
	}) as unknown as User;

const subscriber = (
	id: number,
	email: string,
	overrides: Partial<IListmonkSubscriber> = {},
): IListmonkSubscriber => ({
	id,
	email,
	name: 'x',
	status: 'enabled',
	attribs: {},
	lists: [],
	...overrides,
});

const notFound = () => Object.assign(new Error('not found'), { status: 404 });

const abortedWith = (reason: NewsletterSyncAbortedError['reason']) =>
	expect.objectContaining({ name: 'NewsletterSyncAbortedError', reason });

describe('NewsletterReconciliationService', () => {
	let listmonk: MockProxy<ListmonkClient>;
	let clerkUsers: MockProxy<ClerkUserInfoService>;
	let logger: MockProxy<Logger>;
	let service: NewsletterReconciliationService;

	const clerkHas = (...users: User[]) => clerkUsers.listUsers.mockResolvedValue(users);

	beforeEach(() => {
		listmonk = mock<ListmonkClient>();
		clerkUsers = mock<ClerkUserInfoService>();
		logger = mock<Logger>();
		listmonk.isEnabled.mockReturnValue(true);
		listmonk.getListId.mockReturnValue(7);
		listmonk.listAllSubscribers.mockResolvedValue([]);
		service = new NewsletterReconciliationService(
			listmonk,
			clerkUsers,
			// the real per-user rules, so the outcomes below are the ones a run produces
			new NewsletterSyncService(listmonk, clerkUsers),
			logger,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('does nothing when listmonk is not configured', async () => {
		listmonk.isEnabled.mockReturnValue(false);

		await expect(service.run({ dryRun: false })).resolves.toBeNull();
		expect(listmonk.listAllSubscribers).not.toHaveBeenCalled();
		expect(clerkUsers.listUsers).not.toHaveBeenCalled();
	});

	it('creates, links, follows emails and skips banned or unverified users', async () => {
		clerkHas(
			clerkUser('user_new'),
			clerkUser('user_link'),
			clerkUser('user_moved'),
			clerkUser('user_same'),
			clerkUser('user_banned', { privateMetadata: { banned: true } }),
			clerkUser('user_unverified', {
				primaryEmailAddress: {
					emailAddress: 'x@example.com',
					verification: { status: 'unverified' },
				},
			}),
		);
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(1, 'user_link@example.com', {
				lists: [{ id: 7, subscription_status: 'unsubscribed' }],
			}),
			subscriber(2, 'old@example.com', { attribs: { clerk_user_id: 'user_moved' } }),
			subscriber(3, 'user_same@example.com', {
				attribs: { clerk_user_id: 'user_same', locale: 'en' },
				lists: [{ id: 7, subscription_status: 'unsubscribed' }],
			}),
		]);

		const summary = await service.run({ dryRun: false });

		expect(summary).toEqual({
			clerkUsers: 6,
			subscribers: 3,
			created: 1,
			linked: 1,
			email_updated: 1,
			unchanged: 1,
			missing: 0,
			blocked: 0,
			conflict: 0,
			skipped: 2,
			errors: 0,
			deleted: 0,
			kept: 0,
			banned_unsubscribed: 0,
			recipients_de: 0,
			// only the new one; the others are off the list
			recipients_en: 1,
		});
		expect(listmonk.createSubscriber).toHaveBeenCalledTimes(1);
		expect(listmonk.createSubscriber).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'user_new@example.com',
				attribs: {
					clerk_user_id: 'user_new',
					locale: 'en',
					locale_source: 'auto',
					source: 'sync',
				},
				listIds: [7],
			}),
		);
		expect(listmonk.updateSubscriber).toHaveBeenCalledWith(1, {
			attribs: { clerk_user_id: 'user_link' },
		});
		expect(listmonk.updateSubscriber).toHaveBeenCalledWith(2, { email: 'user_moved@example.com' });
		// never resubscribes
		expect(listmonk.addToList).not.toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith('newsletter.sync.completed', {
			newsletterSync: expect.objectContaining({ dryRun: false, created: 1 }),
		});
	});

	describe('language and banned accounts', () => {
		const onList = [{ id: 7, subscription_status: 'confirmed' as const }];
		const signedUpInGerman = { unsafeMetadata: { locale: 'de' } };
		const banned = { privateMetadata: { banned: true } };

		beforeEach(() => {
			clerkHas(
				clerkUser('user_imported', { unsafeMetadata: { locale: 'en' } }),
				clerkUser('user_chosen', signedUpInGerman),
				clerkUser('user_none', signedUpInGerman),
				clerkUser('user_new_de', signedUpInGerman),
				clerkUser('user_banned', banned),
				clerkUser('user_banned_blocked', banned),
				clerkUser('user_off', signedUpInGerman),
				clerkUser('user_blk'),
			);
			listmonk.listAllSubscribers.mockResolvedValue([
				subscriber(1, 'user_imported@example.com', {
					attribs: { clerk_user_id: 'user_imported', locale: 'de', locale_source: 'auto' },
					lists: onList,
				}),
				subscriber(2, 'user_chosen@example.com', {
					attribs: { clerk_user_id: 'user_chosen', locale: 'en', locale_source: 'user' },
					lists: onList,
				}),
				subscriber(3, 'user_none@example.com', {
					attribs: { clerk_user_id: 'user_none' },
					lists: onList,
				}),
				subscriber(4, 'user_banned@example.com', {
					attribs: { clerk_user_id: 'user_banned', locale: 'en' },
					lists: onList,
				}),
				subscriber(5, 'user_banned_blocked@example.com', {
					status: 'blocklisted',
					attribs: { clerk_user_id: 'user_banned_blocked' },
					lists: onList,
				}),
				subscriber(6, 'user_off@example.com', {
					attribs: { clerk_user_id: 'user_off' },
					lists: [{ id: 7, subscription_status: 'unsubscribed' }],
				}),
				subscriber(7, 'user_blk@example.com', { status: 'blocklisted', lists: onList }),
			]);
		});

		const expectedCounts = {
			created: 1,
			unchanged: 4,
			blocked: 1,
			skipped: 2,
			errors: 0,
			banned_unsubscribed: 1,
			// stored languages plus the new account's sign-up language
			recipients_de: 2,
			recipients_en: 2,
		};

		it('never changes a stored language and unsubscribes banned accounts', async () => {
			await expect(service.run({ dryRun: false })).resolves.toMatchObject(expectedCounts);

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).toHaveBeenCalledTimes(1);
			expect(listmonk.createSubscriber).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'user_new_de@example.com',
					attribs: expect.objectContaining({ locale: 'de', locale_source: 'auto' }),
				}),
			);
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledTimes(1);
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(4);
			// a run never puts anyone back on the list
			expect(listmonk.addToList).not.toHaveBeenCalled();
			// the listing already holds every subscriber
			expect(listmonk.findSubscribers).not.toHaveBeenCalled();
		});

		it('reports the same numbers in dry-run mode without a write', async () => {
			await expect(service.run({ dryRun: true })).resolves.toMatchObject(expectedCounts);

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('counts a conflict by the linked subscriber that still gets mail at the old address', async () => {
			clerkHas(clerkUser('user_moved'));
			listmonk.listAllSubscribers.mockResolvedValue([
				subscriber(1, 'old@example.com', {
					attribs: { clerk_user_id: 'user_moved', locale: 'de' },
					lists: onList,
				}),
				subscriber(2, 'user_moved@example.com', { lists: onList }),
			]);

			await expect(service.run({ dryRun: true })).resolves.toMatchObject({
				conflict: 1,
				recipients_de: 1,
				recipients_en: 0,
			});
		});

		it('does not put an unbanned account back on the list', async () => {
			clerkHas(clerkUser('user_unbanned'));
			listmonk.listAllSubscribers.mockResolvedValue([
				subscriber(4, 'user_unbanned@example.com', {
					attribs: { clerk_user_id: 'user_unbanned' },
					lists: [{ id: 7, subscription_status: 'unsubscribed' }],
				}),
			]);

			await expect(service.run({ dryRun: false })).resolves.toMatchObject({
				unchanged: 1,
				recipients_de: 0,
				recipients_en: 0,
			});
			expect(listmonk.addToList).not.toHaveBeenCalled();
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('leaves a banned account alone once it is off the list', async () => {
			clerkHas(clerkUser('user_banned', banned));
			listmonk.listAllSubscribers.mockResolvedValue([
				subscriber(3, 'user_banned@example.com', {
					attribs: { clerk_user_id: 'user_banned' },
					lists: [{ id: 7, subscription_status: 'unsubscribed' }],
				}),
			]);

			await expect(service.run({ dryRun: false })).resolves.toMatchObject({
				banned_unsubscribed: 0,
				skipped: 1,
			});
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});
	});

	it('pages through all Clerk users, 500 at a time', async () => {
		clerkUsers.listUsers
			.mockResolvedValueOnce(Array.from({ length: 500 }, (_, i) => clerkUser(`user_${i}`)))
			.mockResolvedValueOnce([clerkUser('user_last')]);

		await expect(service.run({ dryRun: true })).resolves.toMatchObject({
			clerkUsers: 501,
			created: 501,
		});

		expect(clerkUsers.listUsers).toHaveBeenCalledTimes(2);
		expect(clerkUsers.listUsers).toHaveBeenNthCalledWith(1, { limit: 500, offset: 0 });
		expect(clerkUsers.listUsers).toHaveBeenNthCalledWith(2, { limit: 500, offset: 500 });
	});

	it('takes the old address off the list when an account moved onto a blocklisted one', async () => {
		clerkHas(clerkUser('user_moved'));
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(2, 'old@example.com', {
				attribs: { clerk_user_id: 'user_moved' },
				lists: [{ id: 7, subscription_status: 'confirmed' }],
			}),
			subscriber(3, 'user_moved@example.com', { status: 'blocklisted' }),
		]);

		await expect(service.run({ dryRun: false })).resolves.toMatchObject({
			blocked: 1,
			conflict: 0,
		});
		expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(2, undefined);
		expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
	});

	it('leaves accounts with a blocklisted subscriber alone, by id or by address', async () => {
		clerkHas(clerkUser('user_person'), clerkUser('user_address'));
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(1, 'old@example.com', {
				status: 'blocklisted',
				attribs: { clerk_user_id: 'user_person' },
			}),
			subscriber(2, 'user_address@example.com', { status: 'blocklisted' }),
		]);

		await expect(service.run({ dryRun: false })).resolves.toMatchObject({
			blocked: 2,
			created: 0,
			deleted: 0,
		});
		expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
	});

	it('deletes subscribers whose account Clerk confirms as gone, keeping blocklisted ones', async () => {
		clerkHas(clerkUser('user_1'));
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(1, 'user_1@example.com', { attribs: { clerk_user_id: 'user_1' } }),
			subscriber(2, 'gone@example.com', { attribs: { clerk_user_id: 'user_gone' } }),
			subscriber(3, 'missed@example.com', { attribs: { clerk_user_id: 'user_missed' } }),
			subscriber(4, 'blocked@example.com', {
				status: 'blocklisted',
				attribs: { clerk_user_id: 'user_gone_too' },
			}),
			subscriber(5, 'kit-import@example.com', { status: 'blocklisted' }),
		]);
		clerkUsers.getUser.mockImplementation((id: string) =>
			id === 'user_missed' ? Promise.resolve(clerkUser(id)) : Promise.reject(notFound()),
		);

		const summary = await service.run({ dryRun: false });

		expect(summary).toMatchObject({ deleted: 1, kept: 1, errors: 0 });
		expect(listmonk.deleteSubscriber).toHaveBeenCalledTimes(1);
		expect(listmonk.deleteSubscriber).toHaveBeenCalledWith(2);
	});

	it('keeps a subscriber when Clerk fails with anything but a 404', async () => {
		clerkHas(clerkUser('user_1'));
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(2, 'gone@example.com', { attribs: { clerk_user_id: 'user_gone' } }),
		]);
		clerkUsers.getUser.mockRejectedValue(Object.assign(new Error('Clerk down'), { status: 500 }));

		await expect(service.run({ dryRun: false })).resolves.toMatchObject({ deleted: 0, errors: 1 });
		expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith('newsletter.sync.delete-failed', {
			error: expect.any(Error),
			userId: 'user_gone',
		});
	});

	it('aborts without deleting when the Clerk listing fails', async () => {
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(2, 'gone@example.com', { attribs: { clerk_user_id: 'user_gone' } }),
		]);
		clerkUsers.listUsers.mockRejectedValue(new Error('Clerk down'));

		const run = service.run({ dryRun: false });

		await expect(run).rejects.toBeInstanceOf(NewsletterSyncAbortedError);
		await expect(run).rejects.toEqual(abortedWith('clerk_list_failed'));
		expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
		expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith('newsletter.sync.aborted', {
			error: expect.any(Error),
			reason: 'clerk_list_failed',
		});
	});

	it('aborts without deleting when Clerk returns no users', async () => {
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(2, 'gone@example.com', { attribs: { clerk_user_id: 'user_gone' } }),
		]);
		clerkHas();

		await expect(service.run({ dryRun: false })).rejects.toEqual(abortedWith('no_clerk_users'));
		expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalledWith('newsletter.sync.aborted', {
			reason: 'no_clerk_users',
		});
	});

	it('fails without a listmonk listing', async () => {
		clerkHas(clerkUser('user_new'));
		listmonk.listAllSubscribers.mockRejectedValue(new Error('listmonk down'));

		await expect(service.run({ dryRun: false })).rejects.toThrow('listmonk down');
		expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
	});

	describe('deletion limit', () => {
		// a Clerk key of another instance: every linked subscriber looks deleted
		const linkedSubscribers = (count: number, total = count) => [
			...Array.from({ length: count }, (_, i) =>
				subscriber(i + 1, `prod_${i}@example.com`, {
					attribs: { clerk_user_id: `user_prod_${i}` },
				}),
			),
			...Array.from({ length: total - count }, (_, i) =>
				subscriber(count + i + 1, `kit_${i}@example.com`, { status: 'blocklisted' }),
			),
		];

		beforeEach(() => {
			clerkHas(clerkUser('user_dev'));
			clerkUsers.getUser.mockRejectedValue(notFound());
		});

		it('aborts before changing anything when more accounts look deleted than allowed', async () => {
			listmonk.listAllSubscribers.mockResolvedValue(linkedSubscribers(11));

			await expect(service.run({ dryRun: false })).rejects.toEqual(
				abortedWith('too_many_deletions'),
			);
			expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(clerkUsers.getUser).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith('newsletter.sync.aborted', {
				reason: 'too_many_deletions',
				newsletterSync: { orphans: 11, deletionLimit: 10, clerkUsers: 1, subscribers: 11 },
			});
		});

		it('aborts a dry run the same way', async () => {
			listmonk.listAllSubscribers.mockResolvedValue(linkedSubscribers(11));

			await expect(service.run({ dryRun: true })).rejects.toEqual(
				abortedWith('too_many_deletions'),
			);
		});

		it('allows up to 10 deletions', async () => {
			listmonk.listAllSubscribers.mockResolvedValue(linkedSubscribers(10));

			await expect(service.run({ dryRun: false })).resolves.toMatchObject({ deleted: 10 });
		});

		it('allows 1 % of the subscribers once that is more than 10', async () => {
			listmonk.listAllSubscribers.mockResolvedValue(linkedSubscribers(12, 1200));
			await expect(service.run({ dryRun: true })).resolves.toMatchObject({ deleted: 12 });

			listmonk.listAllSubscribers.mockResolvedValue(linkedSubscribers(13, 1200));
			await expect(service.run({ dryRun: true })).rejects.toEqual(
				abortedWith('too_many_deletions'),
			);
		});

		it('deletes them when the CLI explicitly allows it', async () => {
			listmonk.listAllSubscribers.mockResolvedValue(linkedSubscribers(11));

			await expect(service.run({ dryRun: false, allowMassDelete: true })).resolves.toMatchObject({
				deleted: 11,
			});
			expect(listmonk.deleteSubscriber).toHaveBeenCalledTimes(11);
		});
	});

	it('only counts in dry-run mode', async () => {
		clerkHas(clerkUser('user_new'), clerkUser('user_moved'), clerkUser('user_blocked'));
		listmonk.listAllSubscribers.mockResolvedValue([
			subscriber(2, 'old@example.com', { attribs: { clerk_user_id: 'user_moved' } }),
			subscriber(3, 'gone@example.com', { attribs: { clerk_user_id: 'user_gone' } }),
			subscriber(4, 'old-blocked@example.com', {
				attribs: { clerk_user_id: 'user_blocked' },
				lists: [{ id: 7, subscription_status: 'confirmed' }],
			}),
			subscriber(5, 'user_blocked@example.com', { status: 'blocklisted' }),
		]);
		clerkUsers.getUser.mockRejectedValue(notFound());

		const summary = await service.run({ dryRun: true });

		expect(summary).toMatchObject({ created: 1, email_updated: 1, blocked: 1, deleted: 1 });
		expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		expect(listmonk.addToList).not.toHaveBeenCalled();
		expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith('newsletter.sync.completed', {
			newsletterSync: expect.objectContaining({ dryRun: true }),
		});
	});

	it('keeps going after a failing user', async () => {
		clerkHas(clerkUser('user_a'), clerkUser('user_b'));
		listmonk.createSubscriber
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce({} as IListmonkSubscriber);

		const summary = await service.run({ dryRun: false });

		expect(summary).toMatchObject({ created: 1, errors: 1 });
		expect(logger.error).toHaveBeenCalledWith('newsletter.sync.user-failed', {
			error: expect.any(Error),
			userId: 'user_a',
		});
	});
});
