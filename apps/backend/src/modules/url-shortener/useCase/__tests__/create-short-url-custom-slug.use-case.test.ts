import { CreateShortUrlUseCase } from '../create-short-url.use-case';
import type ShortUrlRepository from '../../domain/repository/short-url.repository';
import type { CustomDomainValidationService } from '@/modules/custom-domain/service/custom-domain-validation.service';
import { type Logger } from '@/core/logging';
import { mock } from 'jest-mock-extended';
import type { TShortUrlWithDomain } from '../../domain/entities/short-url.entity';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { PlanName } from '@/core/config/plan.config';
import { ConflictError } from '@/core/error/http/conflict.error';
import { BadRequestError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';

describe('CreateShortUrlUseCase — custom slug branch (Variante B)', () => {
	let useCase: CreateShortUrlUseCase;
	let repo: jest.Mocked<ShortUrlRepository>;
	let domainValidation: jest.Mocked<CustomDomainValidationService>;
	let logger: jest.Mocked<Logger>;

	const proUser: TUser = {
		id: 'user_pro',
		tokenType: 'session_token',
		plan: PlanName.PRO,
	};
	const freeUser: TUser = {
		id: 'user_free',
		tokenType: 'session_token',
		plan: PlanName.FREE,
	};

	const mockResult: TShortUrlWithDomain = {
		id: 'url_1',
		shortCode: 'kj7p2',
		customSlug: 'sommer',
		customSlugKey: 'domain_1:sommer',
		name: null,
		destinationUrl: 'https://example.com',
		qrCodeId: null,
		customDomainId: 'domain_1',
		customDomain: null,
		isActive: true,
		createdBy: 'user_pro',
		createdAt: new Date(),
		updatedAt: null,
		deletedAt: null,
	};

	beforeEach(() => {
		repo = mock<ShortUrlRepository>();
		domainValidation = mock<CustomDomainValidationService>();
		logger = mock<Logger>();
		useCase = new CreateShortUrlUseCase(repo, domainValidation, logger);

		repo.generateId.mockReturnValue('url_1');
		repo.generateShortCode.mockResolvedValue('kj7p2');
		repo.findOneById.mockResolvedValue(mockResult);
		repo.findOneActiveByCustomSlugAndDomain.mockResolvedValue(undefined);
		domainValidation.validateForUserUse.mockResolvedValue(undefined as never);
	});

	afterEach(() => jest.clearAllMocks());

	it('always generates a fresh shortCode AND stores customSlug separately', async () => {
		await useCase.execute(
			{
				destinationUrl: 'https://example.com',
				isActive: true,
				customDomainId: 'domain_1',
				customSlug: 'sommer',
			},
			'user_pro',
			proUser,
		);
		expect(repo.generateShortCode).toHaveBeenCalledTimes(1);
		expect(repo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				shortCode: 'kj7p2',
				customSlug: 'sommer',
				customDomainId: 'domain_1',
			}),
		);
	});

	it('lowercases the customSlug before persisting', async () => {
		await useCase.execute(
			{
				destinationUrl: 'https://example.com',
				isActive: true,
				customDomainId: 'domain_1',
				customSlug: 'SoMMer',
			},
			'user_pro',
			proUser,
		);
		expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ customSlug: 'sommer' }));
	});

	it('throws PlanLimitExceededError for non-Pro user', async () => {
		await expect(
			useCase.execute(
				{
					destinationUrl: 'https://example.com',
					isActive: true,
					customDomainId: 'domain_1',
					customSlug: 'sommer',
				},
				'user_free',
				freeUser,
			),
		).rejects.toBeInstanceOf(PlanLimitExceededError);
	});

	it('throws BadRequestError when customSlug set without customDomainId', async () => {
		await expect(
			useCase.execute(
				{
					destinationUrl: 'https://example.com',
					isActive: true,
					customDomainId: null,
					customSlug: 'sommer',
				},
				'user_pro',
				proUser,
			),
		).rejects.toBeInstanceOf(BadRequestError);
	});

	it('rejects reserved slugs', async () => {
		await expect(
			useCase.execute(
				{
					destinationUrl: 'https://example.com',
					isActive: true,
					customDomainId: 'domain_1',
					customSlug: 'admin',
				},
				'user_pro',
				proUser,
			),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it('rejects when slug is already taken on the same domain', async () => {
		repo.findOneActiveByCustomSlugAndDomain.mockResolvedValue({
			...mockResult,
			id: 'other_url',
		});
		await expect(
			useCase.execute(
				{
					destinationUrl: 'https://example.com',
					isActive: true,
					customDomainId: 'domain_1',
					customSlug: 'sommer',
				},
				'user_pro',
				proUser,
			),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it('falls back to no slug when customSlug is empty/null', async () => {
		await useCase.execute(
			{
				destinationUrl: 'https://example.com',
				isActive: true,
				customDomainId: 'domain_1',
				customSlug: null,
			},
			'user_pro',
			proUser,
		);
		expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ customSlug: null }));
	});

	it('does not require user when customSlug is absent (internal/reserved flow)', async () => {
		await useCase.execute(
			{ destinationUrl: null, isActive: false, customDomainId: null },
			'user_pro',
		);
		expect(repo.create).toHaveBeenCalledWith(
			expect.objectContaining({ customSlug: null, shortCode: 'kj7p2' }),
		);
	});
});
