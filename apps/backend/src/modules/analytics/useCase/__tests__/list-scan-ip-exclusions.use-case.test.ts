import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { ListScanIpExclusionsUseCase } from '../list-scan-ip-exclusions.use-case';
import type ScanIpExclusionRepository from '../../domain/repository/scan-ip-exclusion.repository';
import { type TScanIpExclusion } from '../../domain/entities/scan-ip-exclusion.entity';

describe('ListScanIpExclusionsUseCase', () => {
	it("returns the user's entries from the repository", async () => {
		const repository: MockProxy<ScanIpExclusionRepository> = mock<ScanIpExclusionRepository>();
		const rows = [{ id: 'exclusion-1', ipRange: '203.0.113.7' } as TScanIpExclusion];
		repository.findAllByUserId.mockResolvedValue(rows);

		await expect(new ListScanIpExclusionsUseCase(repository).execute('user-1')).resolves.toBe(rows);
		expect(repository.findAllByUserId).toHaveBeenCalledWith('user-1');
	});
});
