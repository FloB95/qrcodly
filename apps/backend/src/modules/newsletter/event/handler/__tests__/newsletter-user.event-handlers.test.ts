import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { container } from 'tsyringe';
import type { UserJSON } from '@clerk/fastify';
import { type Logger } from '@/core/logging';
import { UserCreatedEvent } from '@/core/event/user-created.event';
import { UserUpdatedEvent } from '@/core/event/user-updated.event';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { UserBannedEvent } from '@/core/event/user-banned.event';
import { type NewsletterSyncService } from '../../../service/newsletter-sync.service';
import { AddNewsletterSubscriberOnUserCreatedEventHandler } from '../user-created.event-handler';
import { SyncNewsletterEmailOnUserUpdatedEventHandler } from '../user-updated.event-handler';
import { RemoveNewsletterSubscriberOnUserDeletedEventHandler } from '../user-deleted.event-handler';
import { UnsubscribeNewsletterOnUserBannedEventHandler } from '../user-banned.event-handler';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

const userJSON = {
	id: 'user_1',
	first_name: 'Jane',
	locale: 'de-DE',
	banned: false,
	private_metadata: {},
	primary_email_address_id: 'idn_1',
	email_addresses: [
		{ id: 'idn_1', email_address: 'jane@example.com', verification: { status: 'verified' } },
	],
} as unknown as UserJSON;

const expectedUser = {
	id: 'user_1',
	email: 'jane@example.com',
	firstName: 'Jane',
	locale: 'en',
	banned: false,
};

describe('newsletter user event handlers', () => {
	let sync: MockProxy<NewsletterSyncService>;
	let logger: MockProxy<Logger>;

	beforeEach(() => {
		sync = mock<NewsletterSyncService>();
		logger = mock<Logger>();
		sync.isEnabled.mockReturnValue(true);

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'NewsletterSyncService':
					return sync;
				case 'Logger':
					return logger;
				default:
					return {};
			}
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('user created', () => {
		const handler = () => new AddNewsletterSubscriberOnUserCreatedEventHandler();

		it('adds the new account with source signup', async () => {
			sync.ensureSubscriber.mockResolvedValue('created');

			await handler().handle(new UserCreatedEvent(userJSON));

			expect(sync.ensureSubscriber).toHaveBeenCalledWith(expectedUser, 'signup');
		});

		it('takes the language of the sign-up page', async () => {
			sync.ensureSubscriber.mockResolvedValue('created');
			const signedUpInGerman = {
				...userJSON,
				locale: null,
				unsafe_metadata: { locale: 'de' },
				email_addresses: [
					{ id: 'idn_1', email_address: 'jane@example.com', verification: { status: 'verified' } },
				],
			} as unknown as UserJSON;

			await handler().handle(new UserCreatedEvent(signedUpInGerman));

			expect(sync.ensureSubscriber).toHaveBeenCalledWith(
				expect.objectContaining({ locale: 'de' }),
				'signup',
			);
		});

		it('does nothing when listmonk is not configured', async () => {
			sync.isEnabled.mockReturnValue(false);

			await handler().handle(new UserCreatedEvent(userJSON));

			expect(sync.ensureSubscriber).not.toHaveBeenCalled();
		});

		it('logs failures with the user id only', async () => {
			sync.ensureSubscriber.mockRejectedValue(new Error('down'));

			await expect(handler().handle(new UserCreatedEvent(userJSON))).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledWith('newsletter.sync.user-created.failed', {
				error: expect.any(Error),
				userId: 'user_1',
			});
		});
	});

	describe('user updated', () => {
		const handler = () => new SyncNewsletterEmailOnUserUpdatedEventHandler();

		it('follows the primary email', async () => {
			sync.syncEmail.mockResolvedValue('email_updated');

			await handler().handle(new UserUpdatedEvent(userJSON));

			expect(sync.syncEmail).toHaveBeenCalledWith(expectedUser);
			expect(sync.ensureSubscriber).not.toHaveBeenCalled();
			expect(sync.unsubscribeUser).not.toHaveBeenCalled();
		});

		it.each([
			['banned in the Clerk dashboard', { banned: true }],
			['banned through private metadata', { private_metadata: { banned: true } }],
		])('takes an account %s off the list', async (_, overrides) => {
			sync.unsubscribeUser.mockResolvedValue('unsubscribed');

			await handler().handle(new UserUpdatedEvent({ ...userJSON, ...overrides }));

			expect(sync.unsubscribeUser).toHaveBeenCalledWith('user_1');
			expect(sync.syncEmail).not.toHaveBeenCalled();
			expect(logger.info).toHaveBeenCalledWith('newsletter.sync.user-updated', {
				userId: 'user_1',
				outcome: 'unsubscribed',
			});
		});

		it('stays quiet when the banned account is already off the list', async () => {
			sync.unsubscribeUser.mockResolvedValue('unchanged');

			await handler().handle(new UserUpdatedEvent({ ...userJSON, banned: true }));

			expect(sync.unsubscribeUser).toHaveBeenCalledWith('user_1');
			expect(logger.info).not.toHaveBeenCalled();
		});

		it('does nothing when listmonk is not configured', async () => {
			sync.isEnabled.mockReturnValue(false);

			await handler().handle(new UserUpdatedEvent(userJSON));

			expect(sync.syncEmail).not.toHaveBeenCalled();
		});

		it('logs failures with the user id only', async () => {
			sync.syncEmail.mockRejectedValue(new Error('down'));

			await handler().handle(new UserUpdatedEvent(userJSON));

			expect(logger.error).toHaveBeenCalledWith('newsletter.sync.user-updated.failed', {
				error: expect.any(Error),
				userId: 'user_1',
			});
		});
	});

	describe('user deleted', () => {
		const handler = () => new RemoveNewsletterSubscriberOnUserDeletedEventHandler();

		it('removes the subscriber linked to the account', async () => {
			sync.removeUser.mockResolvedValue('deleted');

			await handler().handle(new UserDeletedEvent({ id: 'user_1' }));

			expect(sync.removeUser).toHaveBeenCalledWith('user_1');
		});

		it('does nothing when listmonk is not configured', async () => {
			sync.isEnabled.mockReturnValue(false);

			await handler().handle(new UserDeletedEvent({ id: 'user_1' }));

			expect(sync.removeUser).not.toHaveBeenCalled();
		});

		it('logs failures with the user id only', async () => {
			sync.removeUser.mockRejectedValue(new Error('down'));

			await handler().handle(new UserDeletedEvent({ id: 'user_1' }));

			expect(logger.error).toHaveBeenCalledWith('newsletter.sync.user-deleted.failed', {
				error: expect.any(Error),
				userId: 'user_1',
			});
		});
	});

	describe('user banned', () => {
		const handler = () => new UnsubscribeNewsletterOnUserBannedEventHandler();

		it('takes the subscriber linked to the account off the list', async () => {
			sync.unsubscribeUser.mockResolvedValue('unsubscribed');

			await handler().handle(new UserBannedEvent({ id: 'user_1' }));

			expect(sync.unsubscribeUser).toHaveBeenCalledWith('user_1');
			expect(logger.info).toHaveBeenCalledWith('newsletter.sync.user-banned', {
				userId: 'user_1',
				outcome: 'unsubscribed',
			});
		});

		it('does nothing when listmonk is not configured', async () => {
			sync.isEnabled.mockReturnValue(false);

			await handler().handle(new UserBannedEvent({ id: 'user_1' }));

			expect(sync.unsubscribeUser).not.toHaveBeenCalled();
		});

		it('logs failures with the user id only', async () => {
			sync.unsubscribeUser.mockRejectedValue(new Error('down'));

			await expect(
				handler().handle(new UserBannedEvent({ id: 'user_1' })),
			).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledWith('newsletter.sync.user-banned.failed', {
				error: expect.any(Error),
				userId: 'user_1',
			});
		});
	});
});
