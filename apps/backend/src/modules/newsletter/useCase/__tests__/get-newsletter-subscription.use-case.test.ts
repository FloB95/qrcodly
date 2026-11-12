import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type { User } from '@clerk/fastify';
import { type TNewsletterSubscriptionStatus } from '@shared/schemas';
import { type Logger } from '@/core/logging';
import { type ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { type ListmonkClient, type IListmonkSubscriber } from '@/libs/listmonk';
import { NewsletterSyncService } from '../../service/newsletter-sync.service';
import { GetNewsletterSubscriptionUseCase } from '../get-newsletter-subscription.use-case';

const clerkUser = ({ verified = true, banned = false, signUpLocale = 'en' } = {}) =>
	({
		id: 'user_1',
		firstName: 'Jane',
		locale: null,
		banned,
		privateMetadata: {},
		unsafeMetadata: { locale: signUpLocale },
		primaryEmailAddress: {
			emailAddress: 'jane@example.com',
			verification: { status: verified ? 'verified' : 'unverified' },
		},
	}) as unknown as User;

const subscriber = (overrides: Partial<IListmonkSubscriber> = {}): IListmonkSubscriber => ({
	id: 10,
	email: 'jane@example.com',
	name: 'Jane',
	status: 'enabled',
	attribs: { clerk_user_id: 'user_1' },
	lists: [{ id: 7, subscription_status: 'confirmed' }],
	...overrides,
});

/** No language is stored, so it reads as English; only states with a choice carry a language */
const response = (status: TNewsletterSubscriptionStatus) => ({
	status,
	locale: status === 'subscribed' || status === 'unsubscribed' ? 'en' : null,
});

describe('GetNewsletterSubscriptionUseCase', () => {
	let listmonk: MockProxy<ListmonkClient>;
	let clerkUsers: MockProxy<ClerkUserInfoService>;
	let logger: MockProxy<Logger>;
	let useCase: GetNewsletterSubscriptionUseCase;

	beforeEach(() => {
		listmonk = mock<ListmonkClient>();
		clerkUsers = mock<ClerkUserInfoService>();
		logger = mock<Logger>();
		listmonk.isEnabled.mockReturnValue(true);
		listmonk.getListId.mockReturnValue(7);
		listmonk.findSubscribers.mockResolvedValue([]);
		clerkUsers.getUser.mockResolvedValue(clerkUser());
		useCase = new GetNewsletterSubscriptionUseCase(
			listmonk,
			new NewsletterSyncService(listmonk, clerkUsers),
			logger,
		);
	});

	it('is disabled when listmonk is not configured', async () => {
		listmonk.isEnabled.mockReturnValue(false);

		await expect(useCase.execute('user_1')).resolves.toEqual(response('disabled'));
		expect(listmonk.findSubscribers).not.toHaveBeenCalled();
		expect(clerkUsers.getUser).not.toHaveBeenCalled();
		expect(logger.error).not.toHaveBeenCalled();
	});

	it.each<[string, IListmonkSubscriber, TNewsletterSubscriptionStatus]>([
		['confirmed on the list', subscriber(), 'subscribed'],
		// single opt-in lists mail unconfirmed memberships too
		[
			'unconfirmed on the list',
			subscriber({ lists: [{ id: 7, subscription_status: 'unconfirmed' }] }),
			'subscribed',
		],
		[
			'unsubscribed from the list',
			subscriber({ lists: [{ id: 7, subscription_status: 'unsubscribed' }] }),
			'unsubscribed',
		],
		[
			'confirmed on another list only',
			subscriber({ lists: [{ id: 3, subscription_status: 'confirmed' }] }),
			'unsubscribed',
		],
		['without any list', subscriber({ lists: [] }), 'unsubscribed'],
		['blocklisted', subscriber({ status: 'blocklisted' }), 'blocked'],
	])('maps a subscriber %s', async (_, found, status) => {
		listmonk.findSubscribers.mockResolvedValue([found]);

		await expect(useCase.execute('user_1')).resolves.toEqual(response(status));
		expect(listmonk.findSubscribers).toHaveBeenCalledTimes(1);
		// a user waits for the settings page: fail fast
		expect(listmonk.findSubscribers).toHaveBeenCalledWith(
			{ attribute: { key: 'clerk_user_id', value: 'user_1' }, email: 'jane@example.com' },
			{ interactive: true },
		);
	});

	it('uses a subscriber that only holds the primary email when none is linked yet', async () => {
		listmonk.findSubscribers.mockResolvedValue([subscriber({ attribs: {}, lists: [] })]);

		await expect(useCase.execute('user_1')).resolves.toEqual(response('unsubscribed'));
	});

	it('is blocked when only the current address is blocklisted', async () => {
		listmonk.findSubscribers.mockResolvedValue([
			subscriber({ status: 'blocklisted', attribs: {}, lists: [] }),
		]);

		await expect(useCase.execute('user_1')).resolves.toEqual(response('blocked'));
	});

	describe('when the address is held by a subscriber linked to another account', () => {
		const foreign = (overrides: Partial<IListmonkSubscriber> = {}) =>
			subscriber({ attribs: { clerk_user_id: 'user_other' }, ...overrides });

		it.each([
			['on the list', foreign()],
			['unsubscribed', foreign({ lists: [{ id: 7, subscription_status: 'unsubscribed' }] })],
		])('is unavailable instead of showing the other account (%s)', async (_, found) => {
			listmonk.findSubscribers.mockResolvedValue([found]);

			await expect(useCase.execute('user_1')).resolves.toEqual(response('unavailable'));
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('is blocked when that subscriber is blocklisted, as in the sync', async () => {
			listmonk.findSubscribers.mockResolvedValue([foreign({ status: 'blocklisted' })]);

			await expect(useCase.execute('user_1')).resolves.toEqual(response('blocked'));
		});
	});

	describe('when the account moved onto an address another subscriber holds', () => {
		const linked = subscriber({ email: 'old@example.com' });

		it('is blocked when that subscriber is blocklisted, as in PUT and the sync', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				linked,
				subscriber({ id: 11, status: 'blocklisted', attribs: {}, lists: [] }),
			]);

			await expect(useCase.execute('user_1')).resolves.toEqual(response('blocked'));
			// reading never changes anything
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('reads the linked subscriber when that subscriber is not blocklisted', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				linked,
				subscriber({ id: 11, attribs: {}, lists: [] }),
			]);

			await expect(useCase.execute('user_1')).resolves.toEqual(response('subscribed'));
		});
	});

	describe('language', () => {
		it.each([
			['picked by the user', { locale: 'en', locale_source: 'user' }, 'en'],
			['set automatically', { locale: 'de', locale_source: 'auto' }, 'de'],
			['missing', {}, 'en'],
		])('is the stored one when it is %s', async (_, attribs, locale) => {
			// the sign-up language only matters when a subscriber is created
			clerkUsers.getUser.mockResolvedValue(clerkUser({ signUpLocale: 'de' }));
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ attribs: { clerk_user_id: 'user_1', ...attribs } }),
			]);

			await expect(useCase.execute('user_1')).resolves.toEqual({ status: 'subscribed', locale });
		});

		it('is the sign-up language for an account the sync will add', async () => {
			clerkUsers.getUser.mockResolvedValue(clerkUser({ signUpLocale: 'de' }));

			await expect(useCase.execute('user_1')).resolves.toEqual({
				status: 'subscribed',
				locale: 'de',
			});
		});
	});

	it('reads as subscribed without creating anything when the sync will add the account', async () => {
		await expect(useCase.execute('user_1')).resolves.toEqual(response('subscribed'));
		expect(listmonk.createSubscriber).not.toHaveBeenCalled();
	});

	it.each([
		['banned', clerkUser({ banned: true })],
		['without a verified email', clerkUser({ verified: false })],
	])('is unavailable without a subscriber for an account the sync skips (%s)', async (_, user) => {
		clerkUsers.getUser.mockResolvedValue(user);

		await expect(useCase.execute('user_1')).resolves.toEqual(response('unavailable'));
		expect(logger.error).not.toHaveBeenCalled();
	});

	it.each([
		['listmonk', () => listmonk.findSubscribers.mockRejectedValue(new Error('down'))],
		['Clerk', () => clerkUsers.getUser.mockRejectedValue(new Error('down'))],
	])('fails soft when %s errors', async (_, fail) => {
		fail();

		await expect(useCase.execute('user_1')).resolves.toEqual(response('unavailable'));
		expect(logger.error).toHaveBeenCalledWith('newsletter.subscription.status-failed', {
			error: expect.any(Error),
			userId: 'user_1',
		});
	});
});
