import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { container, inject, injectable } from 'tsyringe';
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
import { qrCodesUpdated, safely } from '@/core/metrics';
import { isHostedPageContent } from '@shared/schemas';
import {
	HostedPageService,
	type THostedPageUpdatePlan,
} from '@/modules/hosted-page/service/hosted-page.service';

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

		// a hosted page is checked before any image work, so a refused save leaves logo and preview
		let hostedPlan: THostedPageUpdatePlan | undefined;
		if (diffs?.content && validatedUpdates.content) {
			if (isHostedPageContent(validatedUpdates.content)) {
				hostedPlan = await container
					.resolve(HostedPageService)
					.prepareUpdate(qrCode, validatedUpdates.content);
			} else {
				const strategy = this.contentUpdateStrategyService.resolve(qrCode.content.type);
				await strategy.handleContentUpdate(qrCode, validatedUpdates);
			}
		}

		if (diffs?.config && validatedUpdates.config) {
			validatedUpdates.config.image = await this.imageService.handleImageUpdate(
				qrCode.config.image,
				validatedUpdates.config.image,
				qrCode.id,
				updatedBy,
			);
		}

		// the page lives in hosted_page and the QR code keeps encoding the same short URL
		if (hostedPlan) delete validatedUpdates.content;

		if ((diffs?.config || (diffs?.content && !hostedPlan)) && qrCode.previewImage) {
			await this.imageService.deleteImage(qrCode.previewImage);
			validatedUpdates.previewImage = null;
		}

		if (diffs?.content && validatedUpdates.content) {
			validatedUpdates.qrCodeData = await this.qrCodeDataService.computeQrCodeData(
				qrCode.id,
				validatedUpdates.content,
			);
		}

		let linkUnblocked = false;
		await UnitOfWork.run(async () => {
			if (hostedPlan) {
				linkUnblocked = await container.resolve(HostedPageService).applyUpdate(hostedPlan);
			}
			await this.qrCodeRepository.update(qrCode, validatedUpdates);
		});

		// the public page is cached briefly; a content change must show up on the next scan
		if (hostedPlan && qrCode.createdBy) {
			await container
				.resolve(HostedPageService)
				.afterChange(
					qrCode.createdBy,
					hostedPlan.shortCode,
					linkUnblocked ? { shortUrlId: hostedPlan.shortUrlId } : undefined,
				);
		}

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
		safely(() => qrCodesUpdated.add(1, { 'content.type': updatedQrCode.content.type }));

		return updatedQrCode;
	}
}
