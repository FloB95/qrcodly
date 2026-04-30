import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { ImageService } from '@/core/services/image.service';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { CustomApiError } from '@/core/error/http';
import { qrCodesCreated } from '@/core/metrics';
import { type TUser } from '@/core/domain/schema/UserSchema';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { type TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { QrCodeCreatedEvent } from '../event/qr-code-created.event';
import { CreateQrCodePolicy } from '../policies/create-qr-code.policy';
import { ShortUrlStrategyService } from '../service/short-url-strategy.service';
import { QrCodeDataService } from '../service/qr-code-data.service';
import TagRepository from '@/modules/tag/domain/repository/tag.repository';
import {
	QR_CODE_NAME_MAX_LENGTH,
	buildCopyName,
	type TQrCode,
	type TCreateQrCodeDto,
} from '@shared/schemas';
import { QrCodeImageStrategy } from '../domain/strategies/qr-code-image.strategy';

@injectable()
export class DuplicateQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
		@inject(ShortUrlStrategyService) private shortUrlStrategyService: ShortUrlStrategyService,
		@inject(QrCodeDataService) private qrCodeDataService: QrCodeDataService,
		@inject(TagRepository) private tagRepository: TagRepository,
	) {
		this.imageService.setStrategy(new QrCodeImageStrategy());
	}

	async execute(source: TQrCodeWithRelations, user: TUser): Promise<TQrCodeWithRelations> {
		const syntheticDto = {
			content: source.content,
			name: source.name,
		} as TCreateQrCodeDto;
		const policy = new CreateQrCodePolicy(user, syntheticDto);
		await policy.checkAccess();

		let copiedImage: string | undefined;

		try {
			const finalQrCode = await UnitOfWork.run<TQrCodeWithRelations>(async () => {
				const newId = this.qrCodeRepository.generateId();
				const config = structuredClone(source.config);

				if (config.image) {
					copiedImage = await this.imageService.copyImage(config.image, newId, user.id);
					config.image = copiedImage;
				}

				const name = buildCopyName(source.name, QR_CODE_NAME_MAX_LENGTH);

				const qrCodeEntity = {
					id: newId,
					name,
					content: structuredClone(source.content),
					config,
					createdBy: user.id,
					qrCodeData: null as string | null,
					previewImage: null,
				};

				await this.qrCodeRepository.create(qrCodeEntity);

				await this.shortUrlStrategyService.handle(qrCodeEntity as TQrCode);

				const computedQrCodeData = await this.qrCodeDataService.computeQrCodeData(
					newId,
					qrCodeEntity.content,
				);
				await this.qrCodeRepository.update({ id: newId } as never, {
					qrCodeData: computedQrCodeData,
				});

				if (source.tags.length > 0) {
					await this.tagRepository.setQrCodeTags(
						newId,
						source.tags.map((t) => t.id),
					);
				}

				const created = await this.qrCodeRepository.findOneById(newId);
				if (!created) throw new Error('Failed to retrieve duplicated QR code.');

				await policy.incrementUsage();
				return created;
			});

			this.eventEmitter.emit(new QrCodeCreatedEvent(finalQrCode));
			this.logger.info('qrCode.duplicated', {
				qrCode: { id: finalQrCode.id, sourceId: source.id, createdBy: user.id },
			});
			qrCodesCreated.add(1, { 'content.type': source.content.type });

			return finalQrCode;
		} catch (error: any) {
			this.logger.error('qrCode.duplicated.error', { error, sourceId: source.id });

			if (copiedImage) {
				try {
					await this.imageService.deleteImage(copiedImage);
				} catch (cleanupError) {
					this.logger.warn('qrCode.duplicated.cleanup.failed', {
						copiedImage,
						sourceId: source.id,
						cleanupError,
					});
				}
			}

			if (error instanceof CustomApiError) throw error;
			throw new UnhandledServerError(error as Error, 'QR code duplication failed.');
		}
	}
}
