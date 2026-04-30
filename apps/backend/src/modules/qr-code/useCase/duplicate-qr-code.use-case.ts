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
import { QR_CODE_NAME_MAX_LENGTH, type TQrCode, type TCreateQrCodeDto } from '@shared/schemas';

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
	) {}

	async execute(source: TQrCodeWithRelations, user: TUser): Promise<TQrCodeWithRelations> {
		const syntheticDto = {
			content: source.content,
			name: source.name,
		} as TCreateQrCodeDto;
		const policy = new CreateQrCodePolicy(user, syntheticDto);
		await policy.checkAccess();

		let copiedImage: string | undefined;

		try {
			return await UnitOfWork.run<TQrCodeWithRelations>(async () => {
				const newId = this.qrCodeRepository.generateId();
				const config = structuredClone(source.config);

				if (config.image) {
					copiedImage = await this.imageService.copyImage(config.image, newId, user.id);
					config.image = copiedImage;
				}

				const name = this.buildCopyName(source.name);

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

				const finalQrCode = await this.qrCodeRepository.findOneById(newId);
				if (!finalQrCode) throw new Error('Failed to retrieve duplicated QR code.');

				this.eventEmitter.emit(new QrCodeCreatedEvent(finalQrCode));
				this.logger.info('qrCode.duplicated', {
					qrCode: { id: finalQrCode.id, sourceId: source.id, createdBy: user.id },
				});
				qrCodesCreated.add(1, { 'content.type': source.content.type });

				await policy.incrementUsage();
				return finalQrCode;
			});
		} catch (error: any) {
			this.logger.error('qrCode.duplicated.error', { error, sourceId: source.id });

			if (copiedImage) await this.imageService.deleteImage(copiedImage);

			if (error instanceof CustomApiError) throw error;
			throw new UnhandledServerError(error as Error, 'QR code duplication failed.');
		}
	}

	private buildCopyName(originalName: string | null): string {
		const prefix = '(Copy) ';
		const maxLength = QR_CODE_NAME_MAX_LENGTH;
		const base = originalName ?? '';
		if (prefix.length + base.length > maxLength) {
			return prefix + base.slice(0, maxLength - prefix.length);
		}
		return `${prefix}${base}`.trim();
	}
}
