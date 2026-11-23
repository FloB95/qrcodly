import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import ScanIpExclusionRepository from '../domain/repository/scan-ip-exclusion.repository';
import { type TScanIpExclusion } from '../domain/entities/scan-ip-exclusion.entity';

@injectable()
export class ListScanIpExclusionsUseCase implements IBaseUseCase {
	constructor(
		@inject(ScanIpExclusionRepository)
		private repository: ScanIpExclusionRepository,
	) {}

	async execute(userId: string): Promise<TScanIpExclusion[]> {
		return this.repository.findAllByUserId(userId);
	}
}
