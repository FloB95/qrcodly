import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { DeleteScanIpExclusionUseCase } from '../delete-scan-ip-exclusion.use-case';
import type ScanIpExclusionRepository from '../../domain/repository/scan-ip-exclusion.repository';
import { type ScanIpExclusionMatcherService } from '../../service/scan-ip-exclusion-matcher.service';
import { type TScanIpExclusion } from '../../domain/entities/scan-ip-exclusion.entity';

describe('DeleteScanIpExclusionUseCase', () => {
	let useCase: DeleteScanIpExclusionUseCase;
	let repository: MockProxy<ScanIpExclusionRepository>;
	let matcher: MockProxy<ScanIpExclusionMatcherService>;
	let logger: MockProxy<Logger>;

	const exclusion: TScanIpExclusion = {
		id: 'exclusion-1',
		ipRange: '203.0.113.0/24',
		label: 'Office',
		createdBy: 'user-1',
		createdAt: new Date(),
		updatedAt: null,
	};

	beforeEach(() => {
		repository = mock<ScanIpExclusionRepository>();
		matcher = mock<ScanIpExclusionMatcherService>();
		logger = mock<Logger>();
		useCase = new DeleteScanIpExclusionUseCase(repository, matcher, logger);
	});

	it("deletes the entry and clears the owner's cached list", async () => {
		await useCase.execute(exclusion);

		expect(repository.delete).toHaveBeenCalledWith(exclusion);
		expect(matcher.invalidate).toHaveBeenCalledWith('user-1');
		expect(logger.info).toHaveBeenCalledWith('scanIpExclusion.deleted', {
			scanIpExclusion: { id: 'exclusion-1', createdBy: 'user-1' },
		});
	});

	it('keeps the cached list when the delete fails', async () => {
		repository.delete.mockRejectedValue(new Error('db down'));

		await expect(useCase.execute(exclusion)).rejects.toThrow('db down');
		expect(matcher.invalidate).not.toHaveBeenCalled();
	});
});
