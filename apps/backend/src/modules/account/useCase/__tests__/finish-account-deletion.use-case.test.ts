import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import type AccountDeletionRequestRepository from '../../domain/repository/account-deletion-request.repository';
import { type TAccountDeletionRequest } from '../../domain/entities/account-deletion-request.entity';
import { type AccountDeletionNotificationService } from '../../service/account-deletion-notification.service';
import { FinishAccountDeletionUseCase } from '../finish-account-deletion.use-case';

const USER_ID = 'user_leaving';

const request = (overrides: Partial<TAccountDeletionRequest> = {}): TAccountDeletionRequest => ({
	id: 'request-1',
	userId: USER_ID,
	requestedAt: new Date('2026-11-22T19:04:50Z'),
	revokedAt: null,
	confirmedAt: new Date('2026-11-22T19:06:00Z'),
	confirmationTokenHash: null,
	confirmationExpiresAt: null,
	email: 'leaving@example.com',
	...overrides,
});

describe('FinishAccountDeletionUseCase', () => {
	let repository: MockProxy<AccountDeletionRequestRepository>;
	let notification: MockProxy<AccountDeletionNotificationService>;
	let useCase: FinishAccountDeletionUseCase;

	beforeEach(() => {
		repository = mock<AccountDeletionRequestRepository>();
		notification = mock<AccountDeletionNotificationService>();
		useCase = new FinishAccountDeletionUseCase(repository, notification, mock<Logger>());
	});

	it('says goodbye to the stored address of a confirmed request and removes the request', async () => {
		const confirmed = request();
		repository.findByUserId.mockResolvedValue(confirmed);

		await useCase.execute(USER_ID);

		expect(notification.sendGoodbye).toHaveBeenCalledWith('leaving@example.com');
		expect(repository.delete).toHaveBeenCalledWith(confirmed);
	});

	it.each([
		['unconfirmed', request({ confirmedAt: null, email: null })],
		['withdrawn', request({ revokedAt: new Date(), email: null })],
		['confirmed without a known address', request({ email: null })],
	])('sends no mail for a %s request but still removes it', async (_label, row) => {
		repository.findByUserId.mockResolvedValue(row);

		await useCase.execute(USER_ID);

		expect(notification.sendGoodbye).not.toHaveBeenCalled();
		expect(repository.delete).toHaveBeenCalledWith(row);
	});

	it('does nothing for an account without a request', async () => {
		repository.findByUserId.mockResolvedValue(undefined);

		await useCase.execute(USER_ID);

		expect(notification.sendGoodbye).not.toHaveBeenCalled();
		expect(repository.delete).not.toHaveBeenCalled();
	});

	it('keeps the request when the mail fails, so handling the deletion again still sends it', async () => {
		repository.findByUserId.mockResolvedValue(request());
		notification.sendGoodbye.mockRejectedValue(new Error('SMTP down'));

		await expect(useCase.execute(USER_ID)).rejects.toThrow('SMTP down');

		expect(repository.delete).not.toHaveBeenCalled();
	});
});
