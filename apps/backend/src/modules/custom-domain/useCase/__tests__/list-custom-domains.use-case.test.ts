import 'reflect-metadata';
import { ListCustomDomainsUseCase } from '../list-custom-domains.use-case';
import type CustomDomainRepository from '../../domain/repository/custom-domain.repository';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TCustomDomain } from '../../domain/entities/custom-domain.entity';

describe('ListCustomDomainsUseCase', () => {
	let useCase: ListCustomDomainsUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;

	const userId = 'user-123';

	const mockDomain: TCustomDomain = {
		id: 'domain-1',
		domain: 'links.example.com',
		isDefault: false,
		isEnabled: true,
		createdBy: userId,
		createdAt: new Date(),
		updatedAt: null,
		verificationPhase: 'dns_verification',
		ownershipTxtVerified: false,
		cnameVerified: false,
		cloudflareHostnameId: null,
		sslStatus: 'initializing',
		ownershipStatus: 'pending',
		ownershipValidationTxtName: '_qrcodly-verify.links',
		ownershipValidationTxtValue: 'token',
		sslValidationTxtName: null,
		sslValidationTxtValue: null,
		validationErrors: null,
	};

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		useCase = new ListCustomDomainsUseCase(mockRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return domains and pagination metadata', async () => {
		mockRepository.findAll.mockResolvedValue([mockDomain]);
		mockRepository.countTotal.mockResolvedValue(1);

		const result = await useCase.execute(userId, 1, 10);

		expect(result.data).toEqual([mockDomain]);
		expect(result.pagination.total).toBe(1);
		expect(result.pagination.page).toBe(1);
		expect(result.pagination.limit).toBe(10);
	});

	it('should calculate total pages correctly', async () => {
		mockRepository.findAll.mockResolvedValue([]);
		mockRepository.countTotal.mockResolvedValue(25);

		const result = await useCase.execute(userId, 1, 10);

		expect(result.pagination.totalPages).toBe(3);
	});

	it('should filter domains by userId', async () => {
		mockRepository.findAll.mockResolvedValue([]);
		mockRepository.countTotal.mockResolvedValue(0);

		await useCase.execute(userId, 1, 10);

		expect(mockRepository.findAll).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { createdBy: { eq: userId } },
			}),
		);
	});

	it('should return empty data with 0 totalPages when no domains', async () => {
		mockRepository.findAll.mockResolvedValue([]);
		mockRepository.countTotal.mockResolvedValue(0);

		const result = await useCase.execute(userId, 1, 10);

		expect(result.data).toEqual([]);
		expect(result.pagination.total).toBe(0);
		expect(result.pagination.totalPages).toBe(0);
	});

	it('should pass page and limit to repository', async () => {
		mockRepository.findAll.mockResolvedValue([]);
		mockRepository.countTotal.mockResolvedValue(0);

		await useCase.execute(userId, 2, 5);

		expect(mockRepository.findAll).toHaveBeenCalledWith(
			expect.objectContaining({ page: 2, limit: 5 }),
		);
	});
});
