import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { EnforceCustomDomainLimitUseCase } from '../enforce-custom-domain-limit.use-case';
import type CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import { type CustomDomainEntitlementService } from '@/core/services/custom-domain-entitlement.service';
import { type TCustomDomain } from '@/modules/custom-domain/domain/entities/custom-domain.entity';
import { type Logger } from '@/core/logging';

const USER_ID = 'user-123';

const domain = (overrides: Partial<TCustomDomain> & { id: string }): TCustomDomain =>
	({
		domain: `${overrides.id}.example.com`,
		isDefault: false,
		isEnabled: true,
		createdBy: USER_ID,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		...overrides,
	}) as TCustomDomain;

describe('EnforceCustomDomainLimitUseCase', () => {
	let useCase: EnforceCustomDomainLimitUseCase;
	let mockRepository: MockProxy<CustomDomainRepository>;
	let mockEntitlementService: MockProxy<CustomDomainEntitlementService>;
	let mockLogger: MockProxy<Logger>;

	const setLimit = (effectiveLimit: number) =>
		mockEntitlementService.getCustomDomainLimit.mockResolvedValue({
			baseLimit: 1,
			addonSlots: Math.max(0, effectiveLimit - 1),
			effectiveLimit,
		});

	beforeEach(() => {
		mockRepository = mock<CustomDomainRepository>();
		mockEntitlementService = mock<CustomDomainEntitlementService>();
		mockLogger = mock<Logger>();
		useCase = new EnforceCustomDomainLimitUseCase(
			mockRepository,
			mockEntitlementService,
			mockLogger,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should keep the default domain even when it is the newest', async () => {
		const oldest = domain({ id: 'a', createdAt: new Date('2026-01-01T00:00:00Z') });
		const newestDefault = domain({
			id: 'b',
			createdAt: new Date('2026-06-01T00:00:00Z'),
			isDefault: true,
		});
		setLimit(1);
		mockRepository.findAllByUserId.mockResolvedValue([oldest, newestDefault]);

		const result = await useCase.execute(USER_ID);

		expect(result.disabled).toEqual(['a.example.com']);
		expect(mockRepository.update).toHaveBeenCalledWith(oldest, {
			isEnabled: false,
			isDefault: false,
		});
		expect(mockRepository.update).toHaveBeenCalledTimes(1);
	});

	it('should keep the oldest domains when none is the default', async () => {
		const first = domain({ id: 'a', createdAt: new Date('2026-01-01T00:00:00Z') });
		const second = domain({ id: 'b', createdAt: new Date('2026-02-01T00:00:00Z') });
		const third = domain({ id: 'c', createdAt: new Date('2026-03-01T00:00:00Z') });
		setLimit(2);
		mockRepository.findAllByUserId.mockResolvedValue([third, first, second]);

		const result = await useCase.execute(USER_ID);

		expect(result.disabled).toEqual(['c.example.com']);
	});

	it('should clear isDefault on a domain it disables', async () => {
		const onlyDomain = domain({ id: 'a', isDefault: true });
		setLimit(0);
		mockRepository.findAllByUserId.mockResolvedValue([onlyDomain]);

		await useCase.execute(USER_ID);

		expect(mockRepository.update).toHaveBeenCalledWith(onlyDomain, {
			isEnabled: false,
			isDefault: false,
		});
	});

	it('should re-enable domains that fit under a raised limit', async () => {
		const active = domain({ id: 'a' });
		const dormant = domain({ id: 'b', isEnabled: false });
		setLimit(2);
		mockRepository.findAllByUserId.mockResolvedValue([active, dormant]);

		const result = await useCase.execute(USER_ID);

		expect(result.enabled).toEqual(['b.example.com']);
		expect(mockRepository.update).toHaveBeenCalledWith(dormant, { isEnabled: true });
	});

	it('should write nothing when the state already matches', async () => {
		setLimit(1);
		mockRepository.findAllByUserId.mockResolvedValue([
			domain({ id: 'a' }),
			domain({ id: 'b', isEnabled: false, createdAt: new Date('2026-05-01T00:00:00Z') }),
		]);

		const result = await useCase.execute(USER_ID);

		expect(result.enabled).toEqual([]);
		expect(result.disabled).toEqual([]);
		expect(mockRepository.update).not.toHaveBeenCalled();
		expect(mockLogger.info).not.toHaveBeenCalled();
	});

	it('should order deterministically when timestamps collide', async () => {
		const sameMoment = new Date('2026-01-01T00:00:00Z');
		setLimit(1);
		mockRepository.findAllByUserId.mockResolvedValue([
			domain({ id: 'b', createdAt: sameMoment }),
			domain({ id: 'a', createdAt: sameMoment }),
		]);

		const first = await useCase.execute(USER_ID);
		const second = await useCase.execute(USER_ID);

		expect(first.disabled).toEqual(['b.example.com']);
		expect(second.disabled).toEqual(first.disabled);
	});

	it('should report the same decision without writing in dry-run mode', async () => {
		setLimit(1);
		mockRepository.findAllByUserId.mockResolvedValue([
			domain({ id: 'a' }),
			domain({ id: 'b', createdAt: new Date('2026-05-01T00:00:00Z') }),
		]);

		const dry = await useCase.execute(USER_ID, { dryRun: true });
		expect(mockRepository.update).not.toHaveBeenCalled();

		const wet = await useCase.execute(USER_ID);
		expect(dry.disabled).toEqual(wet.disabled);
		expect(mockRepository.update).toHaveBeenCalledTimes(1);
	});
});
