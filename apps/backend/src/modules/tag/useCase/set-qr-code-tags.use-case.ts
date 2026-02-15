import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import TagRepository from '../domain/repository/tag.repository';
import { Logger } from '@/core/logging';
import { type TTag } from '../domain/entities/tag.entity';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { SetQrCodeTagsPolicy } from '../policies/set-qr-code-tags.policy';
import QrCodeRepository from '@/modules/qr-code/domain/repository/qr-code.repository';
import { QrCodeNotFoundError } from '@/modules/qr-code/error/http/qr-code-not-found.error';
import { ForbiddenError } from '@/core/error/http';

@injectable()
export class SetQrCodeTagsUseCase implements IBaseUseCase {
	constructor(
		@inject(TagRepository) private tagRepository: TagRepository,
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
	) {}

	async execute(qrCodeId: string, tagIds: string[], user: TUser): Promise<TTag[]> {
		// Verify QR code exists and belongs to the authenticated user
		const qrCode = await this.qrCodeRepository.findOneById(qrCodeId);
		if (!qrCode) throw new QrCodeNotFoundError();
		if (qrCode.createdBy !== user.id) throw new ForbiddenError();

		// Verify all tags exist and belong to the authenticated user
		for (const tagId of tagIds) {
			const tag = await this.tagRepository.findOneById(tagId);
			if (!tag || tag.createdBy !== user.id) throw new ForbiddenError();
		}

		// Check plan limits
		const policy = new SetQrCodeTagsPolicy(user, tagIds.length);
		policy.checkAccess();

		await this.tagRepository.setQrCodeTags(qrCodeId, tagIds);
		const tags = await this.tagRepository.findTagsByQrCodeId(qrCodeId);

		this.logger.info('tag.qr-code-tags-set', {
			qrCodeTags: {
				qrCodeId,
				tagCount: tagIds.length,
				userId: user.id,
			},
		});

		return tags;
	}
}
