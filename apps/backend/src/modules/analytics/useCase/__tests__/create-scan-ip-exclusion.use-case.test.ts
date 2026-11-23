import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { MAX_SCAN_IP_EXCLUSIONS } from '@shared/schemas';
import { type Logger } from '@/core/logging';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { PlanName } from '@/core/config/plan.config';
import { BadRequestError } from '@/core/error/http';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { CreateScanIpExclusionUseCase } from '../create-scan-ip-exclusion.use-case';
import type ScanIpExclusionRepository from '../../domain/repository/scan-ip-exclusion.repository';
import { type ScanIpExclusionMatcherService } from '../../service/scan-ip-exclusion-matcher.service';
import { type TScanIpExclusion } from '../../domain/entities/scan-ip-exclusion.entity';
import { ScanIpExclusionAlreadyExistsError } from '../../error';

describe('CreateScanIpExclusionUseCase', () => {
	let useCase: CreateScanIpExclusionUseCase;
	let repository: MockProxy<ScanIpExclusionRepository>;
	let matcher: MockProxy<ScanIpExclusionMatcherService>;
	let logger: MockProxy<Logger>;

	const proUser: TUser = { id: 'user-1', tokenType: 'session_token', plan: PlanName.PRO };
	const freeUser: TUser = { ...proUser, plan: PlanName.FREE };

	const row = (ipRange: string, id = ipRange): TScanIpExclusion => ({
		id,
		ipRange,
		label: null,
		createdBy: proUser.id,
		createdAt: new Date(),
		updatedAt: null,
	});

	beforeEach(() => {
		repository = mock<ScanIpExclusionRepository>();
		matcher = mock<ScanIpExclusionMatcherService>();
		logger = mock<Logger>();
		useCase = new CreateScanIpExclusionUseCase(repository, matcher, logger);

		let stored: TScanIpExclusion | undefined;
		repository.findAllByUserId.mockResolvedValue([]);
		repository.generateId.mockReturnValue('new-id');
		repository.create.mockImplementation(async (item) => {
			stored = { ...item, createdAt: new Date(), updatedAt: null };
		});
		repository.findOneById.mockImplementation(async () => stored);
	});

	it('stores the normalized range with its label and clears the cached list', async () => {
		const created = await useCase.execute(
			{ ipRange: '198.51.100.77/24', label: 'Office' },
			proUser,
		);

		expect(repository.create).toHaveBeenCalledWith({
			id: 'new-id',
			ipRange: '198.51.100.0/24',
			label: 'Office',
			createdBy: proUser.id,
		});
		expect(matcher.invalidate).toHaveBeenCalledWith(proUser.id);
		expect(created).toMatchObject({ id: 'new-id', ipRange: '198.51.100.0/24', label: 'Office' });
		expect(logger.info).toHaveBeenCalledWith('scanIpExclusion.created', {
			scanIpExclusion: { id: 'new-id', createdBy: proUser.id },
		});
	});

	it('stores an empty label as null', async () => {
		await useCase.execute({ ipRange: '203.0.113.7', label: '' }, proUser);

		expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ label: null }));
	});

	it('rejects a free user', async () => {
		await expect(useCase.execute({ ipRange: '203.0.113.7' }, freeUser)).rejects.toThrow(
			PlanLimitExceededError,
		);
		expect(repository.create).not.toHaveBeenCalled();
	});

	it('rejects a Pro user at the limit', async () => {
		repository.findAllByUserId.mockResolvedValue(
			Array.from({ length: MAX_SCAN_IP_EXCLUSIONS }, (_, i) => row(`203.0.113.${i}`)),
		);

		await expect(useCase.execute({ ipRange: '198.51.100.7' }, proUser)).rejects.toThrow(
			PlanLimitExceededError,
		);
		expect(repository.create).not.toHaveBeenCalled();
	});

	it.each([
		['198.51.100.0/24', '198.51.100.77/24'],
		['203.0.113.7', '::ffff:203.0.113.7'],
		['203.0.113.7', '203.0.113.7/32'],
		['2001:db8::1', '2001:db8:0:0::1'],
	])('rejects %p written as %p as a duplicate', async (stored, input) => {
		repository.findAllByUserId.mockResolvedValue([row(stored)]);

		await expect(useCase.execute({ ipRange: input }, proUser)).rejects.toThrow(
			ScanIpExclusionAlreadyExistsError,
		);
		expect(repository.create).not.toHaveBeenCalled();
		expect(matcher.invalidate).not.toHaveBeenCalled();
	});

	it('turns a duplicate insert from a concurrent request into a conflict', async () => {
		repository.create.mockRejectedValue(
			Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }),
		);

		await expect(useCase.execute({ ipRange: '203.0.113.7' }, proUser)).rejects.toThrow(
			ScanIpExclusionAlreadyExistsError,
		);
		expect(matcher.invalidate).not.toHaveBeenCalled();
	});

	it('passes other insert errors on', async () => {
		repository.create.mockRejectedValue(new Error('db down'));

		await expect(useCase.execute({ ipRange: '203.0.113.7' }, proUser)).rejects.toThrow('db down');
	});

	it('rejects an IPv4-mapped range that is too wide as IPv4', async () => {
		await expect(useCase.execute({ ipRange: '::ffff:0:0/96' }, proUser)).rejects.toThrow(
			BadRequestError,
		);
		expect(repository.create).not.toHaveBeenCalled();
	});
});
