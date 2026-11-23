import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import ScanIpExclusionRepository from '../domain/repository/scan-ip-exclusion.repository';
import { type TScanIpExclusion } from '../domain/entities/scan-ip-exclusion.entity';
import { ScanIpExclusionMatcherService } from '../service/scan-ip-exclusion-matcher.service';

@injectable()
export class DeleteScanIpExclusionUseCase implements IBaseUseCase {
	constructor(
		@inject(ScanIpExclusionRepository)
		private repository: ScanIpExclusionRepository,
		@inject(ScanIpExclusionMatcherService)
		private matcher: ScanIpExclusionMatcherService,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(scanIpExclusion: TScanIpExclusion): Promise<void> {
		await this.repository.delete(scanIpExclusion);
		await this.matcher.invalidate(scanIpExclusion.createdBy);

		this.logger.info('scanIpExclusion.deleted', {
			scanIpExclusion: { id: scanIpExclusion.id, createdBy: scanIpExclusion.createdBy },
		});
	}
}
