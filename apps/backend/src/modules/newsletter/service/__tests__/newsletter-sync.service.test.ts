import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type { User } from '@clerk/fastify';
import { type ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { ListmonkApiError, type ListmonkClient, type IListmonkSubscriber } from '@/libs/listmonk';
import { type INewsletterUser } from '../../domain/newsletter-user.interface';
import { NewsletterSyncService } from '../newsletter-sync.service';

const user = (overrides: Partial<INewsletterUser> = {}): INewsletterUser => ({
	id: 'user_1',
	email: 'jane@example.com',
	firstName: 'Jane',
	locale: 'de',
	banned: false,
	...overrides,
});

const subscriber = (overrides: Partial<IListmonkSubscriber> = {}): IListmonkSubscriber => ({
	id: 10,
	email: 'jane@example.com',
	name: 'Jane',
	status: 'enabled',
	attribs: { clerk_user_id: 'user_1', locale: 'de', locale_source: 'auto' },
	lists: [{ id: 7, subscription_status: 'confirmed' }],
	...overrides,
});

const blocklistedHolder = () =>
	subscriber({ id: 11, status: 'blocklisted', attribs: {}, lists: [] });

describe('NewsletterSyncService', () => {
	let listmonk: MockProxy<ListmonkClient>;
	let clerkUsers: MockProxy<ClerkUserInfoService>;
	let service: NewsletterSyncService;

	beforeEach(() => {
		listmonk = mock<ListmonkClient>();
		clerkUsers = mock<ClerkUserInfoService>();
		listmonk.getListId.mockReturnValue(7);
		listmonk.findSubscribers.mockResolvedValue([]);
		service = new NewsletterSyncService(listmonk, clerkUsers);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('is enabled when listmonk is configured', () => {
		listmonk.isEnabled.mockReturnValue(true);
		expect(service.isEnabled()).toBe(true);

		listmonk.isEnabled.mockReturnValue(false);
		expect(service.isEnabled()).toBe(false);
	});

	describe('getUser', () => {
		it('maps the Clerk user', async () => {
			clerkUsers.getUser.mockResolvedValue({
				id: 'user_1',
				firstName: 'Jane',
				locale: 'en-US',
				banned: false,
				privateMetadata: {},
				unsafeMetadata: { locale: 'de' },
				primaryEmailAddress: {
					emailAddress: 'Jane@Example.com',
					verification: { status: 'verified' },
				},
			} as unknown as User);

			await expect(service.getUser('user_1')).resolves.toEqual(user());
			expect(clerkUsers.getUser).toHaveBeenCalledWith('user_1');
		});

		it('passes a Clerk failure on', async () => {
			const notFound = Object.assign(new Error('Not Found'), { status: 404 });
			clerkUsers.getUser.mockRejectedValue(notFound);

			await expect(service.getUser('user_gone')).rejects.toBe(notFound);
		});
	});

	describe('findMatch', () => {
		it('looks up by the clerk_user_id attribute or the email and passes the options on', async () => {
			const linked = subscriber({ email: 'old@example.com' });
			const holder = subscriber({ id: 11, attribs: {} });
			listmonk.findSubscribers.mockResolvedValue([holder, linked]);

			await expect(
				service.findMatch('user_1', 'jane@example.com', { interactive: true }),
			).resolves.toEqual({ byClerkId: linked, byEmail: holder });

			expect(listmonk.findSubscribers).toHaveBeenCalledWith(
				{ attribute: { key: 'clerk_user_id', value: 'user_1' }, email: 'jane@example.com' },
				{ interactive: true },
			);
		});
	});

	describe('ensureSubscriber', () => {
		it('creates a new subscriber on the list with the sign-up attribs', async () => {
			await expect(service.ensureSubscriber(user(), 'signup')).resolves.toBe('created');

			expect(listmonk.findSubscribers).toHaveBeenCalledWith(
				{ attribute: { key: 'clerk_user_id', value: 'user_1' }, email: 'jane@example.com' },
				undefined,
			);
			expect(listmonk.createSubscriber).toHaveBeenCalledWith({
				email: 'jane@example.com',
				name: 'Jane',
				attribs: {
					clerk_user_id: 'user_1',
					locale: 'de',
					locale_source: 'auto',
					source: 'signup',
				},
				listIds: [7],
			});
		});

		it('falls back to the email local part', async () => {
			await service.ensureSubscriber(user({ firstName: null, locale: 'en' }), 'signup');

			expect(listmonk.createSubscriber).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'jane',
					attribs: {
						clerk_user_id: 'user_1',
						locale: 'en',
						locale_source: 'auto',
						source: 'signup',
					},
				}),
			);
		});

		it('only links an existing subscriber found by email', async () => {
			const existing = subscriber({ attribs: { city: 'Köln' }, lists: [] });
			listmonk.findSubscribers.mockResolvedValue([existing]);

			await expect(service.ensureSubscriber(user(), 'signup')).resolves.toBe('linked');

			expect(listmonk.updateSubscriber).toHaveBeenCalledWith(10, {
				attribs: { city: 'Köln', clerk_user_id: 'user_1' },
			});
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
			expect(listmonk.addToList).not.toHaveBeenCalled();
		});

		it.each([
			['unsubscribed from the list', [{ id: 7, subscription_status: 'unsubscribed' as const }]],
			['without list membership', []],
		])('never resubscribes a subscriber %s', async (_, lists) => {
			listmonk.findSubscribers.mockResolvedValue([subscriber({ lists })]);

			await expect(service.ensureSubscriber(user(), 'sync')).resolves.toBe('unchanged');

			expect(listmonk.addToList).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it.each([
			['banned', user({ banned: true })],
			['without a verified primary email', user({ email: null })],
		])('skips a user who is %s without asking listmonk', async (_, skipped) => {
			await expect(service.ensureSubscriber(skipped, 'signup')).resolves.toBe('skipped');

			expect(listmonk.findSubscribers).not.toHaveBeenCalled();
		});

		it('leaves blocklisted subscribers alone', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ status: 'blocklisted', attribs: {} }),
			]);

			await expect(service.ensureSubscriber(user(), 'signup')).resolves.toBe('blocked');

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('does not take over a subscriber linked to another account', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ attribs: { clerk_user_id: 'user_other' } }),
			]);

			await expect(service.ensureSubscriber(user(), 'signup')).resolves.toBe('conflict');

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('treats a parallel create (409) as a conflict', async () => {
			listmonk.createSubscriber.mockRejectedValue(new ListmonkApiError(409, 'subscribers.create'));

			await expect(service.ensureSubscriber(user(), 'signup')).resolves.toBe('conflict');
		});

		it('passes other listmonk failures on', async () => {
			listmonk.createSubscriber.mockRejectedValue(new ListmonkApiError(500, 'subscribers.create'));

			await expect(service.ensureSubscriber(user(), 'signup')).rejects.toBeInstanceOf(
				ListmonkApiError,
			);
		});
	});

	describe('syncEmail', () => {
		it('follows a changed primary email', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber({ email: 'old@example.com' })]);

			await expect(service.syncEmail(user())).resolves.toBe('email_updated');

			expect(listmonk.updateSubscriber).toHaveBeenCalledWith(10, { email: 'jane@example.com' });
		});

		it('does nothing when the email is unchanged (e.g. a metadata update)', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber({ email: 'Jane@Example.com' })]);

			await expect(service.syncEmail(user())).resolves.toBe('unchanged');

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('only changes the email, never the stored language', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({
					email: 'old@example.com',
					attribs: { clerk_user_id: 'user_1', locale: 'en', locale_source: 'auto' },
				}),
			]);

			await expect(service.syncEmail(user({ locale: 'de' }))).resolves.toBe('email_updated');

			expect(listmonk.updateSubscriber).toHaveBeenCalledTimes(1);
			expect(listmonk.updateSubscriber).toHaveBeenCalledWith(10, { email: 'jane@example.com' });
		});

		it('never creates a subscriber', async () => {
			await expect(service.syncEmail(user())).resolves.toBe('missing');

			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		});

		it('reports a conflict when another subscriber already holds the new email', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ email: 'old@example.com' }),
				subscriber({ id: 11, attribs: {} }),
			]);

			await expect(service.syncEmail(user())).resolves.toBe('conflict');

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('takes the old address off the list when the new one is blocklisted', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ email: 'old@example.com' }),
				blocklistedHolder(),
			]);

			await expect(service.syncEmail(user())).resolves.toBe('blocked');

			expect(listmonk.unsubscribeFromList).toHaveBeenCalledTimes(1);
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, undefined);
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.addToList).not.toHaveBeenCalled();
		});

		it.each([
			['unsubscribed', [{ id: 7, subscription_status: 'unsubscribed' as const }]],
			['not a member', []],
		])('stays blocked without another call once the old address is %s', async (_, lists) => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ email: 'old@example.com', lists }),
				blocklistedHolder(),
			]);

			await expect(service.syncEmail(user())).resolves.toBe('blocked');

			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('keeps blocking the person after an email change', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ email: 'old@example.com', status: 'blocklisted' }),
			]);

			await expect(service.syncEmail(user())).resolves.toBe('blocked');

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});
	});

	describe('apply', () => {
		it('only counts in dry-run mode', async () => {
			const match = { byClerkId: subscriber({ email: 'old@example.com' }), byEmail: null };

			await expect(
				service.apply(user(), match, { source: 'sync', create: true, dryRun: true }),
			).resolves.toBe('email_updated');
			await expect(
				service.apply(
					user(),
					{ byClerkId: null, byEmail: subscriber({ attribs: {} }) },
					{ source: 'sync', create: true, dryRun: true },
				),
			).resolves.toBe('linked');
			await expect(
				service.apply(
					user(),
					{ byClerkId: null, byEmail: null },
					{ source: 'sync', create: true, dryRun: true },
				),
			).resolves.toBe('created');
			await expect(
				service.apply(
					user(),
					{ ...match, byEmail: blocklistedHolder() },
					{ source: 'sync', create: true, dryRun: true },
				),
			).resolves.toBe('blocked');

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});
	});

	describe('language of an existing subscriber', () => {
		it.each([
			['chosen by the user', { clerk_user_id: 'user_1', locale: 'en', locale_source: 'user' }],
			['set automatically', { clerk_user_id: 'user_1', locale: 'en', locale_source: 'auto' }],
			['missing', { clerk_user_id: 'user_1' }],
		])('is never changed when it is %s', async (_, attribs) => {
			const found = subscriber({ attribs });

			await expect(
				service.apply(
					user({ locale: 'de' }),
					{ byClerkId: found, byEmail: found },
					{ source: 'sync', create: true },
				),
			).resolves.toBe('unchanged');

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		});
	});

	describe('unsubscribe', () => {
		it('takes a subscriber off the list', async () => {
			await expect(service.unsubscribe(subscriber())).resolves.toBe('unsubscribed');

			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10);
		});

		it.each([
			['missing', null, 'missing'],
			['blocklisted', subscriber({ status: 'blocklisted' }), 'blocked'],
			[
				'already unsubscribed',
				subscriber({ lists: [{ id: 7, subscription_status: 'unsubscribed' }] }),
				'unchanged',
			],
			['not on the list', subscriber({ lists: [] }), 'unchanged'],
		])('does nothing when the subscriber is %s', async (_, found, outcome) => {
			await expect(service.unsubscribe(found)).resolves.toBe(outcome);

			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
			expect(listmonk.addToList).not.toHaveBeenCalled();
		});

		it('only counts in dry-run mode', async () => {
			await expect(service.unsubscribe(subscriber(), true)).resolves.toBe('unsubscribed');

			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('unsubscribes the subscriber linked to a banned account', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber()]);

			await expect(service.unsubscribeUser('user_1')).resolves.toBe('unsubscribed');

			expect(listmonk.findSubscribers).toHaveBeenCalledWith(
				{ attribute: { key: 'clerk_user_id', value: 'user_1' }, email: undefined },
				undefined,
			);
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10);
		});

		it('ignores a subscriber that only shares the email of a banned account', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber({ attribs: {} })]);

			await expect(service.unsubscribeUser('user_1')).resolves.toBe('missing');

			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});
	});

	describe('stopMailingOldAddress', () => {
		it('unsubscribes the linked subscriber with the given request options', async () => {
			await service.stopMailingOldAddress(
				{ byClerkId: subscriber({ email: 'old@example.com' }), byEmail: blocklistedHolder() },
				{ interactive: true },
			);

			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, { interactive: true });
		});

		it('never touches a blocklisted linked subscriber', async () => {
			await service.stopMailingOldAddress({
				byClerkId: subscriber({ email: 'old@example.com', status: 'blocklisted' }),
				byEmail: blocklistedHolder(),
			});

			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});
	});

	describe('removeUser', () => {
		it('deletes the subscriber linked to the account', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber()]);

			await expect(service.removeUser('user_1')).resolves.toBe('deleted');

			expect(listmonk.findSubscribers).toHaveBeenCalledWith(
				{ attribute: { key: 'clerk_user_id', value: 'user_1' }, email: undefined },
				undefined,
			);
			expect(listmonk.deleteSubscriber).toHaveBeenCalledWith(10);
		});

		it('keeps a blocklisted subscriber, reduced to its address', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber({ status: 'blocklisted' })]);

			await expect(service.removeUser('user_1')).resolves.toBe('blocked');

			expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
			expect(listmonk.replaceSubscriber).toHaveBeenCalledWith(10, {
				email: 'jane@example.com',
				name: 'jane@example.com',
				status: 'blocklisted',
				attribs: {},
			});
		});

		it('ignores subscribers that only share the email', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber({ attribs: {} })]);

			await expect(service.removeUser('user_1')).resolves.toBe('missing');

			expect(listmonk.deleteSubscriber).not.toHaveBeenCalled();
		});
	});
});
