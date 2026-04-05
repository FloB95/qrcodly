import 'reflect-metadata';
import { ClearDefaultCustomDomainUseCase } from '../clear-default-custom-domain.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';

describe('ClearDefaultCustomDomainUseCase', () => {
	let useCase: ClearDefaultCustomDomainUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;
	let mockLogger: MockProxy<Logger>;

	const userId = 'user-123';

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		mockLogger = mock<Logger>();
		useCase = new ClearDefaultCustomDomainUseCase(mockRepository, mockLogger);
		mockRepository.clearDefault.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should clear the default custom domain for the user', async () => {
		await useCase.execute(userId);

		expect(mockRepository.clearDefault).toHaveBeenCalledWith(userId);
	});

	it('should log the clear action', async () => {
		await useCase.execute(userId);

		expect(mockLogger.info).toHaveBeenCalledWith('customDomain.clearDefault', {
			customDomain: { userId },
		});
	});

	it('should propagate repository errors', async () => {
		mockRepository.clearDefault.mockRejectedValue(new Error('Database error'));

		await expect(useCase.execute(userId)).rejects.toThrow('Database error');
	});
});
