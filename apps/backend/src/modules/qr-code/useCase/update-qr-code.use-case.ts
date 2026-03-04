import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { TQrCode, TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { objDiff, TUpdateQrCodeDto, UpdateQrCodeDto } from '@shared/schemas';
import { QrCodeUpdatedEvent } from '../event/qr-code-updated.event';
import { EventEmitter } from '@/core/event';
import { QrCodeContentTypeChangeError } from '../error/http/qr-code-content-type-change.error';
import { ImageService } from '@/core/services/image.service';
import { QrCodeDataService } from '../service/qr-code-data.service';
import { ContentUpdateStrategyService } from '../service/content-update-strategy.service';
import { UnitOfWork } from '@/core/db/unit-of-work';

@injectable()
export class UpdateQrCodeUseCase implements IBaseUseCase<
	[TQrCode, TUpdateQrCodeDto, string],
	TQrCodeWithRelations
> {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
		@inject(QrCodeDataService) private qrCodeDataService: QrCodeDataService,
		@inject(ContentUpdateStrategyService)
		private contentUpdateStrategyService: ContentUpdateStrategyService,
	) {}

	async execute(
		qrCode: TQrCode,
		updates: TUpdateQrCodeDto,
		updatedBy: string,
	): Promise<TQrCodeWithRelations> {
		const validatedUpdates: Partial<TQrCode> = UpdateQrCodeDto.parse(updates);
		validatedUpdates.updatedAt = new Date();

		const diffs = objDiff(qrCode, validatedUpdates, [
			'id',
			'previewImage',
			'createdAt',
			'createdBy',
			'updatedAt',
			'shortUrl',
		]) as Partial<TQrCode>;

		if (Object.keys(diffs).length < 1) {
			return qrCode as TQrCodeWithRelations;
		}

		if (validatedUpdates.content?.type && qrCode.content.type !== validatedUpdates.content.type) {
			throw new QrCodeContentTypeChangeError();
		}

		if (diffs?.content && validatedUpdates.content) {
			const strategy = this.contentUpdateStrategyService.resolve(qrCode.content.type);
			await strategy.handleContentUpdate(qrCode, validatedUpdates);
		}

		if (diffs?.config && validatedUpdates.config) {
			validatedUpdates.config.image = await this.imageService.handleImageUpdate(
				qrCode.config.image,
				validatedUpdates.config.image,
				qrCode.id,
				updatedBy,
			);
		}

		if ((diffs?.config || diffs?.content) && qrCode.previewImage) {
			await this.imageService.deleteImage(qrCode.previewImage);
			validatedUpdates.previewImage = null;
		}

		if (diffs?.content && validatedUpdates.content) {
			validatedUpdates.qrCodeData = await this.qrCodeDataService.computeQrCodeData(
				qrCode.id,
				validatedUpdates.content,
			);
		}

		await UnitOfWork.run(async () => {
			await this.qrCodeRepository.update(qrCode, validatedUpdates);
		});

		const updatedQrCode = (await this.qrCodeRepository.findOneById(
			qrCode.id,
		)) as TQrCodeWithRelations;

		const event = new QrCodeUpdatedEvent(updatedQrCode);
		this.eventEmitter.emit(event);

		this.logger.info('qrCode.updated', {
			qrCode: {
				id: updatedQrCode.id,
				updates: diffs,
				updatedBy,
			},
		});

		return updatedQrCode;
	}
}
