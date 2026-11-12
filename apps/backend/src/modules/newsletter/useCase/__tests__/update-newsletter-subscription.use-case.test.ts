import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import type { User } from '@clerk/fastify';
import { type Logger } from '@/core/logging';
import { BadRequestError, ConflictError, ServiceUnavailableError } from '@/core/error/http';
import { type ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { ListmonkApiError, type ListmonkClient, type IListmonkSubscriber } from '@/libs/listmonk';
import { NewsletterSyncService } from '../../service/newsletter-sync.service';
import { UpdateNewsletterSubscriptionUseCase } from '../update-newsletter-subscription.use-case';

const INTERACTIVE = { interactive: true };

const clerkUser = ({
	email = 'jane@example.com',
	firstName = 'Jane',
	verified = true,
	banned = false,
	signUpLocale,
}: {
	email?: string;
	firstName?: string;
	verified?: boolean;
	banned?: boolean;
	signUpLocale?: string;
} = {}) =>
	({
		id: 'user_1',
		firstName,
		locale: null,
		banned,
		privateMetadata: {},
		unsafeMetadata: signUpLocale ? { locale: signUpLocale } : {},
		primaryEmailAddress: {
			emailAddress: email,
			verification: { status: verified ? 'verified' : 'unverified' },
		},
	}) as unknown as User;

const subscriber = (overrides: Partial<IListmonkSubscriber> = {}): IListmonkSubscriber => ({
	id: 10,
	email: 'jane@example.com',
	name: 'Jane',
	status: 'enabled',
	attribs: { clerk_user_id: 'user_1', locale: 'en', locale_source: 'auto', source: 'sync' },
	lists: [{ id: 7, subscription_status: 'confirmed' }],
	...overrides,
});

const lookup = (email: string | null = 'jane@example.com') => ({
	attribute: { key: 'clerk_user_id', value: 'user_1' },
	email,
});

describe('UpdateNewsletterSubscriptionUseCase', () => {
	let listmonk: MockProxy<ListmonkClient>;
	let clerkUsers: MockProxy<ClerkUserInfoService>;
	let logger: MockProxy<Logger>;
	let useCase: UpdateNewsletterSubscriptionUseCase;

	beforeEach(() => {
		listmonk = mock<ListmonkClient>();
		clerkUsers = mock<ClerkUserInfoService>();
		logger = mock<Logger>();
		listmonk.isEnabled.mockReturnValue(true);
		listmonk.getListId.mockReturnValue(7);
		clerkUsers.getUser.mockResolvedValue(clerkUser());
		listmonk.findSubscribers.mockResolvedValue([]);
		listmonk.createSubscriber.mockResolvedValue(subscriber({ id: 12 }));
		useCase = new UpdateNewsletterSubscriptionUseCase(
			listmonk,
			new NewsletterSyncService(listmonk, clerkUsers),
			logger,
		);
	});

	it('answers 503 when listmonk is not configured', async () => {
		listmonk.isEnabled.mockReturnValue(false);

		await expect(useCase.execute('user_1', { subscribed: true })).rejects.toBeInstanceOf(
			ServiceUnavailableError,
		);
		expect(clerkUsers.getUser).not.toHaveBeenCalled();
	});

	it('creates a subscriber on the list when subscribing without a record', async () => {
		await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
			status: 'subscribed',
			locale: 'en',
		});

		expect(listmonk.findSubscribers).toHaveBeenCalledWith(lookup(), INTERACTIVE);
		expect(listmonk.createSubscriber).toHaveBeenCalledWith(
			{
				email: 'jane@example.com',
				name: 'Jane',
				attribs: {
					clerk_user_id: 'user_1',
					locale: 'en',
					locale_source: 'auto',
					source: 'settings',
				},
				listIds: [7],
			},
			INTERACTIVE,
		);
	});

	it('records an opt-out as an unsubscribed membership when there is no record yet', async () => {
		await expect(useCase.execute('user_1', { subscribed: false })).resolves.toEqual({
			status: 'unsubscribed',
			locale: 'en',
		});

		expect(listmonk.createSubscriber).toHaveBeenCalledWith(
			expect.objectContaining({
				attribs: {
					clerk_user_id: 'user_1',
					locale: 'en',
					locale_source: 'auto',
					source: 'settings',
				},
				listIds: [],
			}),
			INTERACTIVE,
		);
		expect(listmonk.addToList).toHaveBeenCalledWith(12, 'unsubscribed', INTERACTIVE);
	});

	it('puts an unsubscribed subscriber back on the list on an explicit toggle', async () => {
		listmonk.findSubscribers.mockResolvedValue([
			subscriber({ lists: [{ id: 7, subscription_status: 'unsubscribed' }] }),
		]);

		await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
			status: 'subscribed',
			locale: 'en',
		});

		expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		expect(listmonk.addToList).toHaveBeenCalledWith(10, 'confirmed', INTERACTIVE);
		expect(listmonk.createSubscriber).not.toHaveBeenCalled();
	});

	it('updates email and name that changed, leaving the attribs alone', async () => {
		clerkUsers.getUser.mockResolvedValue(
			clerkUser({ email: 'new@example.com', firstName: 'Janet' }),
		);
		listmonk.findSubscribers.mockResolvedValue([
			subscriber({ attribs: { clerk_user_id: 'user_1', source: 'sync', city: 'Köln' } }),
		]);

		await useCase.execute('user_1', { subscribed: true });

		expect(listmonk.updateSubscriber).toHaveBeenCalledWith(
			10,
			{
				email: 'new@example.com',
				name: 'Janet',
			},
			INTERACTIVE,
		);
	});

	it('links a subscriber found by email to the account', async () => {
		listmonk.findSubscribers.mockResolvedValue([subscriber({ attribs: { source: 'kit' } })]);

		await useCase.execute('user_1', { subscribed: true });

		expect(listmonk.updateSubscriber).toHaveBeenCalledWith(
			10,
			{
				attribs: { source: 'kit', clerk_user_id: 'user_1' },
			},
			INTERACTIVE,
		);
	});

	describe('language', () => {
		it('stores a picked language as the user choice', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber()]);

			await expect(useCase.execute('user_1', { subscribed: true, locale: 'de' })).resolves.toEqual({
				status: 'subscribed',
				locale: 'de',
			});

			expect(listmonk.updateSubscriber).toHaveBeenCalledWith(
				10,
				{
					attribs: {
						clerk_user_id: 'user_1',
						locale: 'de',
						locale_source: 'user',
						source: 'sync',
					},
				},
				INTERACTIVE,
			);
		});

		it('stores a language picked while unsubscribing', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber()]);

			await expect(useCase.execute('user_1', { subscribed: false, locale: 'de' })).resolves.toEqual(
				{ status: 'unsubscribed', locale: 'de' },
			);

			expect(listmonk.updateSubscriber).toHaveBeenCalledWith(
				10,
				{ attribs: expect.objectContaining({ locale: 'de', locale_source: 'user' }) },
				INTERACTIVE,
			);
		});

		it('creates a new subscriber with the picked language', async () => {
			await expect(useCase.execute('user_1', { subscribed: true, locale: 'de' })).resolves.toEqual({
				status: 'subscribed',
				locale: 'de',
			});

			expect(listmonk.createSubscriber).toHaveBeenCalledWith(
				expect.objectContaining({
					attribs: {
						clerk_user_id: 'user_1',
						locale: 'de',
						locale_source: 'user',
						source: 'settings',
					},
				}),
				INTERACTIVE,
			);
		});

		it('keeps an earlier choice when the toggle sends no language', async () => {
			const chosen = { clerk_user_id: 'user_1', locale: 'de', locale_source: 'user' };
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ attribs: chosen, lists: [{ id: 7, subscription_status: 'unsubscribed' }] }),
			]);

			await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
				status: 'subscribed',
				locale: 'de',
			});

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('changes nothing when the same language is picked again', async () => {
			const chosen = { clerk_user_id: 'user_1', locale: 'de', locale_source: 'user' };
			listmonk.findSubscribers.mockResolvedValue([subscriber({ attribs: chosen })]);

			await useCase.execute('user_1', { subscribed: true, locale: 'de' });

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('keeps an automatic language when the toggle sends no language', async () => {
			clerkUsers.getUser.mockResolvedValue(clerkUser({ signUpLocale: 'en' }));
			const imported = { clerk_user_id: 'user_1', locale: 'de', locale_source: 'auto' };
			listmonk.findSubscribers.mockResolvedValue([subscriber({ attribs: imported })]);

			await expect(useCase.execute('user_1', { subscribed: false })).resolves.toEqual({
				status: 'unsubscribed',
				locale: 'de',
			});

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('reads a subscriber without a stored language as English', async () => {
			clerkUsers.getUser.mockResolvedValue(clerkUser({ signUpLocale: 'de' }));
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ attribs: { clerk_user_id: 'user_1' } }),
			]);

			await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
				status: 'subscribed',
				locale: 'en',
			});

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('changes only the language without touching an unsubscribed membership', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ lists: [{ id: 7, subscription_status: 'unsubscribed' }] }),
			]);

			await expect(useCase.execute('user_1', { locale: 'de' })).resolves.toEqual({
				status: 'unsubscribed',
				locale: 'de',
			});

			expect(listmonk.updateSubscriber).toHaveBeenCalledWith(
				10,
				{ attribs: expect.objectContaining({ locale: 'de', locale_source: 'user' }) },
				INTERACTIVE,
			);
			expect(listmonk.addToList).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('creates a missing subscriber on the list when only a language is picked', async () => {
			await expect(useCase.execute('user_1', { locale: 'de' })).resolves.toEqual({
				status: 'subscribed',
				locale: 'de',
			});

			expect(listmonk.createSubscriber).toHaveBeenCalledWith(
				expect.objectContaining({
					attribs: expect.objectContaining({ locale: 'de', locale_source: 'user' }),
					listIds: [7],
				}),
				INTERACTIVE,
			);
			expect(listmonk.addToList).not.toHaveBeenCalled();
		});

		it('gives a new subscriber the sign-up language when none is picked', async () => {
			clerkUsers.getUser.mockResolvedValue(clerkUser({ signUpLocale: 'de' }));

			await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
				status: 'subscribed',
				locale: 'de',
			});

			expect(listmonk.createSubscriber).toHaveBeenCalledWith(
				expect.objectContaining({
					attribs: expect.objectContaining({ locale: 'de', locale_source: 'auto' }),
				}),
				INTERACTIVE,
			);
		});
	});

	it('unsubscribes from the list', async () => {
		listmonk.findSubscribers.mockResolvedValue([subscriber()]);

		await expect(useCase.execute('user_1', { subscribed: false })).resolves.toEqual({
			status: 'unsubscribed',
			locale: 'en',
		});

		expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, INTERACTIVE);
		expect(listmonk.addToList).not.toHaveBeenCalled();
	});

	it('adds an unsubscribed membership when there is none', async () => {
		listmonk.findSubscribers.mockResolvedValue([subscriber({ lists: [] })]);

		await useCase.execute('user_1', { subscribed: false });

		expect(listmonk.addToList).toHaveBeenCalledWith(10, 'unsubscribed', INTERACTIVE);
		expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
	});

	it('changes nothing when already unsubscribed', async () => {
		listmonk.findSubscribers.mockResolvedValue([
			subscriber({ lists: [{ id: 7, subscription_status: 'unsubscribed' }] }),
		]);

		await useCase.execute('user_1', { subscribed: false });

		expect(listmonk.addToList).not.toHaveBeenCalled();
		expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
	});

	describe('when another subscriber holds the new primary email', () => {
		const linked = subscriber({ email: 'old@example.com' });
		const holder = subscriber({ id: 11, attribs: {}, lists: [] });

		it('keeps the old email on the linked subscriber instead of failing', async () => {
			listmonk.findSubscribers.mockResolvedValue([linked, holder]);

			await expect(useCase.execute('user_1', { subscribed: false })).resolves.toEqual({
				status: 'unsubscribed',
				locale: 'en',
			});

			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, INTERACTIVE);
			expect(logger.warn).toHaveBeenCalledWith('newsletter.subscription.email-conflict', {
				userId: 'user_1',
			});
		});

		it.each([true, false])(
			'reports a blocklisted holder as blocked and stops mailing the old address (%s)',
			async (subscribed) => {
				listmonk.findSubscribers.mockResolvedValue([
					linked,
					subscriber({ id: 11, attribs: {}, status: 'blocklisted' }),
				]);

				await expect(useCase.execute('user_1', { subscribed })).resolves.toEqual({
					status: 'blocked',
					locale: null,
				});

				expect(listmonk.unsubscribeFromList).toHaveBeenCalledTimes(1);
				expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, INTERACTIVE);
				expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
				expect(listmonk.addToList).not.toHaveBeenCalled();
			},
		);

		it('stays blocked without another call once the old address is off the list', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({
					email: 'old@example.com',
					lists: [{ id: 7, subscription_status: 'unsubscribed' }],
				}),
				subscriber({ id: 11, attribs: {}, status: 'blocklisted' }),
			]);

			await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
				status: 'blocked',
				locale: null,
			});

			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
			expect(listmonk.addToList).not.toHaveBeenCalled();
		});
	});

	describe('when the address is held by a subscriber linked to another account', () => {
		const foreign = (overrides: Partial<IListmonkSubscriber> = {}) =>
			subscriber({
				attribs: { clerk_user_id: 'user_other', locale: 'de', source: 'sync' },
				lists: [{ id: 7, subscription_status: 'unsubscribed' }],
				...overrides,
			});

		const expectNoWrite = () => {
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.addToList).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		};

		// taking it over would leave the other account without a subscriber, and the sync would
		// then subscribe that account again
		it.each([true, false])(
			'answers 409 and leaves the record to the other account (%s)',
			async (subscribed) => {
				listmonk.findSubscribers.mockResolvedValue([foreign()]);

				await expect(useCase.execute('user_1', { subscribed })).rejects.toBeInstanceOf(
					ConflictError,
				);

				expectNoWrite();
				expect(logger.warn).toHaveBeenCalledWith(
					'newsletter.subscription.linked-to-other-account',
					{ userId: 'user_1' },
				);
				expect(logger.error).not.toHaveBeenCalled();
			},
		);

		it('is blocked when that subscriber is blocklisted', async () => {
			listmonk.findSubscribers.mockResolvedValue([foreign({ status: 'blocklisted' })]);

			await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
				status: 'blocked',
				locale: null,
			});
			expectNoWrite();
		});
	});

	it.each([
		['linked to the account', subscriber({ status: 'blocklisted' })],
		['holding the address only', subscriber({ status: 'blocklisted', attribs: {}, lists: [] })],
	])('never changes a blocklisted subscriber %s', async (_, blocklisted) => {
		listmonk.findSubscribers.mockResolvedValue([blocklisted]);

		for (const subscribed of [true, false]) {
			await expect(useCase.execute('user_1', { subscribed })).resolves.toEqual({
				status: 'blocked',
				locale: null,
			});
		}

		expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		expect(listmonk.addToList).not.toHaveBeenCalled();
		expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		expect(listmonk.createSubscriber).not.toHaveBeenCalled();
	});

	it('continues with the record a parallel sign-up created (409)', async () => {
		listmonk.createSubscriber.mockRejectedValue(new ListmonkApiError(409, 'subscribers.create'));
		listmonk.findSubscribers
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([subscriber({ lists: [] })]);

		await expect(useCase.execute('user_1', { subscribed: true })).resolves.toEqual({
			status: 'subscribed',
			locale: 'en',
		});

		expect(listmonk.addToList).toHaveBeenCalledWith(10, 'confirmed', INTERACTIVE);
	});

	it('unsubscribes before a profile update that fails', async () => {
		clerkUsers.getUser.mockResolvedValue(clerkUser({ firstName: 'Janet' }));
		listmonk.findSubscribers.mockResolvedValue([subscriber()]);
		listmonk.updateSubscriber.mockRejectedValue(new ListmonkApiError(500, 'x'));

		await expect(useCase.execute('user_1', { subscribed: false })).rejects.toBeInstanceOf(
			ServiceUnavailableError,
		);
		expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, INTERACTIVE);
		expect(listmonk.unsubscribeFromList.mock.invocationCallOrder[0]).toBeLessThan(
			listmonk.updateSubscriber.mock.invocationCallOrder[0],
		);
	});

	it('answers 503 when listmonk fails', async () => {
		listmonk.findSubscribers.mockResolvedValue([subscriber()]);
		listmonk.unsubscribeFromList.mockRejectedValue(new ListmonkApiError(500, 'x'));

		await expect(useCase.execute('user_1', { subscribed: false })).rejects.toBeInstanceOf(
			ServiceUnavailableError,
		);
		expect(logger.error).toHaveBeenCalledWith('newsletter.subscription.update-failed', {
			error: expect.any(ListmonkApiError),
			userId: 'user_1',
		});
	});

	it('answers 503 when Clerk fails', async () => {
		clerkUsers.getUser.mockRejectedValue(new Error('Clerk down'));

		await expect(useCase.execute('user_1', { subscribed: true })).rejects.toBeInstanceOf(
			ServiceUnavailableError,
		);
		expect(listmonk.findSubscribers).not.toHaveBeenCalled();
	});

	it.each([true, false])(
		'answers 400 instead of dropping the choice of an account without a verified email (%s)',
		async (subscribed) => {
			clerkUsers.getUser.mockResolvedValue(clerkUser({ verified: false }));

			await expect(useCase.execute('user_1', { subscribed })).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		},
	);

	describe.each([
		['a banned account', clerkUser({ banned: true })],
		['an account without a verified email', clerkUser({ verified: false })],
	])('for %s', (_, user) => {
		beforeEach(() => {
			clerkUsers.getUser.mockResolvedValue(user);
		});

		it('answers 400 to subscribing without touching the linked subscriber', async () => {
			listmonk.findSubscribers.mockResolvedValue([
				subscriber({ lists: [{ id: 7, subscription_status: 'unsubscribed' }] }),
			]);

			await expect(useCase.execute('user_1', { subscribed: true })).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(listmonk.addToList).not.toHaveBeenCalled();
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('answers 400 to a language without a subscriber instead of creating one', async () => {
			await expect(useCase.execute('user_1', { locale: 'de' })).rejects.toBeInstanceOf(
				BadRequestError,
			);
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		});

		it('still unsubscribes the linked subscriber', async () => {
			listmonk.findSubscribers.mockResolvedValue([subscriber()]);

			await expect(useCase.execute('user_1', { subscribed: false })).resolves.toEqual({
				status: 'unsubscribed',
				locale: 'en',
			});
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, INTERACTIVE);
		});
	});

	it('looks up an account without a verified email by its id only', async () => {
		clerkUsers.getUser.mockResolvedValue(clerkUser({ verified: false }));
		listmonk.findSubscribers.mockResolvedValue([subscriber()]);

		await useCase.execute('user_1', { subscribed: false });

		expect(listmonk.findSubscribers).toHaveBeenCalledWith(lookup(null), INTERACTIVE);
	});
});
