import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { isDuplicateEntryError } from '@/core/db/utils';
import { BadRequestError } from '@/core/error/http';
import { ScanIpRangeSchema, type TCreateScanIpExclusionDto } from '@shared/schemas';
import ScanIpExclusionRepository from '../domain/repository/scan-ip-exclusion.repository';
import { type TScanIpExclusion } from '../domain/entities/scan-ip-exclusion.entity';
import { CreateScanIpExclusionPolicy } from '../policies/create-scan-ip-exclusion.policy';
import { ScanIpExclusionAlreadyExistsError } from '../error';
import { ScanIpExclusionMatcherService } from '../service/scan-ip-exclusion-matcher.service';
import { normalizeIpRange } from '../utils/normalize-ip-range';

@injectable()
export class CreateScanIpExclusionUseCase implements IBaseUseCase {
	constructor(
		@inject(ScanIpExclusionRepository)
		private repository: ScanIpExclusionRepository,
		@inject(ScanIpExclusionMatcherService)
		private matcher: ScanIpExclusionMatcherService,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(dto: TCreateScanIpExclusionDto, user: TUser): Promise<TScanIpExclusion> {
		const existing = await this.repository.findAllByUserId(user.id);

		new CreateScanIpExclusionPolicy(user, existing.length).checkAccess();

		const ipRange = normalizeIpRange(dto.ipRange);
		// An IPv4-mapped range turns into IPv4 here, where it has to meet the IPv4 minimum prefix
		const normalized = ScanIpRangeSchema.safeParse(ipRange);
		if (!normalized.success) {
			throw new BadRequestError('Invalid request body', normalized.error);
		}

		if (existing.some((e) => e.ipRange === ipRange)) {
			throw new ScanIpExclusionAlreadyExistsError();
		}

		const newId = this.repository.generateId();

		try {
			await this.repository.create({
				id: newId,
				ipRange,
				label: dto.label || null,
				createdBy: user.id,
			});
		} catch (error) {
			if (isDuplicateEntryError(error)) {
				throw new ScanIpExclusionAlreadyExistsError();
			}
			throw error;
		}

		await this.matcher.invalidate(user.id);

		const created = await this.repository.findOneById(newId);
		if (!created) throw new Error('Failed to create scan IP exclusion');

		this.logger.info('scanIpExclusion.created', {
			scanIpExclusion: { id: created.id, createdBy: created.createdBy },
		});

		return created;
	}
}
