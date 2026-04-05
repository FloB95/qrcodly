import 'reflect-metadata';
import { DeleteShortUrlUseCase } from '../delete-short-url.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TShortUrl } from '../../domain/entities/short-url.entity';
import { BadRequestError } from '@/core/error/http';

describe('DeleteShortUrlUseCase', () => {
	let useCase: DeleteShortUrlUseCase;
	let mockRepository: MockProxy<ShortUrlRepository>;
	let mockLogger: MockProxy<Logger>;

	const mockStandaloneShortUrl: TShortUrl = {
		id: 'short-url-1',
		shortCode: 'ABC12',
		name: null,
		destinationUrl: 'https://example.com',
		customDomainId: null,
		isActive: true,
		qrCodeId: null,
		createdBy: 'user-123',
		createdAt: new Date(),
		updatedAt: null,
		deletedAt: null,
	};

	const mockLinkedShortUrl: TShortUrl = {
		...mockStandaloneShortUrl,
		qrCodeId: 'qr-code-1',
	};

	beforeEach(() => {
		mockRepository = mock<ShortUrlRepository>();
		mockLogger = mock<Logger>();
		useCase = new DeleteShortUrlUseCase(mockRepository, mockLogger);
		mockRepository.update.mockResolvedValue(undefined);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should soft-delete a standalone short URL successfully', async () => {
		await useCase.execute(mockStandaloneShortUrl, 'user-123');

		expect(mockRepository.update).toHaveBeenCalledWith(
			mockStandaloneShortUrl,
			expect.objectContaining({ deletedAt: expect.any(Date) }),
		);
	});

	it('should log the deletion', async () => {
		await useCase.execute(mockStandaloneShortUrl, 'user-123');

		expect(mockLogger.info).toHaveBeenCalledWith('shortUrl.deleted', {
			shortUrl: {
				id: mockStandaloneShortUrl.id,
				shortCode: mockStandaloneShortUrl.shortCode,
				deletedBy: 'user-123',
			},
		});
	});

	it('should throw BadRequestError when short URL is linked to a QR code', async () => {
		await expect(useCase.execute(mockLinkedShortUrl, 'user-123')).rejects.toThrow(BadRequestError);
	});

	it('should not update repository when short URL is linked to a QR code', async () => {
		await expect(useCase.execute(mockLinkedShortUrl, 'user-123')).rejects.toThrow();

		expect(mockRepository.update).not.toHaveBeenCalled();
	});

	it('should propagate repository errors', async () => {
		mockRepository.update.mockRejectedValue(new Error('Database error'));

		await expect(useCase.execute(mockStandaloneShortUrl, 'user-123')).rejects.toThrow(
			'Database error',
		);
	});

	it('should call repository.update with a deletedAt date', async () => {
		const before = new Date();

		await useCase.execute(mockStandaloneShortUrl, 'user-123');

		const after = new Date();
		const [[, updates]] = mockRepository.update.mock.calls;
		expect((updates as { deletedAt: Date }).deletedAt.getTime()).toBeGreaterThanOrEqual(
			before.getTime(),
		);
		expect((updates as { deletedAt: Date }).deletedAt.getTime()).toBeLessThanOrEqual(after.getTime());
	});
});
