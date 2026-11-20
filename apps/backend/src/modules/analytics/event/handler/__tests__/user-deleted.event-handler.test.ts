import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { type Logger } from '@/core/logging';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import type AnalyticsIntegrationRepository from '../../../domain/repository/analytics-integration.repository';
import { DeleteAnalyticsIntegrationsOnUserDeletedEventHandler } from '../user-deleted.event-handler';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('DeleteAnalyticsIntegrationsOnUserDeletedEventHandler', () => {
	let logger: MockProxy<Logger>;
	let repository: MockProxy<AnalyticsIntegrationRepository>;
	let handler: DeleteAnalyticsIntegrationsOnUserDeletedEventHandler;

	const event = new UserDeletedEvent({ id: 'user-1' });

	beforeEach(() => {
		logger = mock<Logger>();
		repository = mock<AnalyticsIntegrationRepository>();
		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			if (name === 'Logger') return logger;
			if (name === 'AnalyticsIntegrationRepository') return repository;
			return {};
		});
		handler = new DeleteAnalyticsIntegrationsOnUserDeletedEventHandler();
	});

	it("deletes the user's integrations", async () => {
		await handler.handle(event);

		expect(repository.deleteAllByUserId).toHaveBeenCalledWith('user-1');
		expect(logger.error).not.toHaveBeenCalled();
	});

	it('logs a failure with the user id instead of letting it escape', async () => {
		repository.deleteAllByUserId.mockRejectedValue(new Error('boom'));

		await expect(handler.handle(event)).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith('analytics.integration.user-cleanup.failed', {
			error: expect.any(Error),
			userId: 'user-1',
		});
	});
});
