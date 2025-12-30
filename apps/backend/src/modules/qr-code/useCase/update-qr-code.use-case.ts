import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { TQrCode, TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { objDiff, TUpdateQrCodeDto, UpdateQrCodeDto, UpdateShortUrlDto } from '@shared/schemas';
import { QrCodeUpdatedEvent } from '../event/qr-code-updated.event';
import { EventEmitter } from '@/core/event';
import { QrCodeContentTypeChangeError } from '../error/http/qr-code-content-type-change.error';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { ImageService } from '@/core/services/image.service';

/**
 * Use case for updating the name of an existing QR code.
 */
@injectable()
export class UpdateQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ShortUrlRepository) private shortUrlRepository: ShortUrlRepository,
		@inject(UpdateShortUrlUseCase) private updateShortUrlUseCase: UpdateShortUrlUseCase,
		@inject(ImageService) private imageService: ImageService,
	) {}

	/**
	 * Executes the use case to update the name of an existing QR code.
	 * @param id The ID of the QR code to update.
	 * @param name The new name for the QR code.
	 * @param updatedBy The ID of the user performing the update.
	 * @returns A promise that resolves with the updated QR code entity.
	 */
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

		// dont update if no changes
		if (Object.keys(diffs).length < 1) {
			return qrCode as TQrCodeWithRelations;
		}

		// make sure content type is not changed
		if (validatedUpdates.content?.type && qrCode.content.type !== validatedUpdates.content?.type) {
			throw new QrCodeContentTypeChangeError();
		}

		// TODO implement service class with different strategies to handle URL shortening
		// if update is destination url and qr code is connected with short url, update short url
		if (qrCode.content.type === 'url' && validatedUpdates.content?.type === 'url') {
			if (qrCode.content.data.isEditable) {
				const shortUrl = await this.shortUrlRepository.findOneByQrCodeId(qrCode.id);
				if (!shortUrl) {
					throw new ShortUrlNotFoundError();
				}

				const updateDto = UpdateShortUrlDto.parse({
					destinationUrl: validatedUpdates.content.data.url,
				});

				await this.updateShortUrlUseCase.execute(shortUrl, updateDto, updatedBy);

				// reset content data to current qr code content
				validatedUpdates.content = qrCode.content;
			} else {
				// if not editable, update qr code url directly
				validatedUpdates.content.data.url = validatedUpdates.content.data.url;
				validatedUpdates.content.data.isEditable = false;
			}
		}

		if (diffs?.config && validatedUpdates.config) {
			// delete and reupload image if changed
			if (
				qrCode.config.image &&
				validatedUpdates.config?.image &&
				!validatedUpdates.config.image.includes(qrCode.config.image)
			) {
				await this.imageService.deleteImage(qrCode.config.image);

				validatedUpdates.config.image = await this.imageService.uploadImage(
					validatedUpdates.config.image,
					qrCode.id,
					updatedBy,
				);
			} else if (!validatedUpdates.config?.image && qrCode.config.image) {
				// delete existing image
				await this.imageService.deleteImage(qrCode.config.image);
			} else if (!qrCode.config.image && validatedUpdates.config?.image) {
				// upload new image
				validatedUpdates.config.image = await this.imageService.uploadImage(
					validatedUpdates.config.image,
					qrCode.id,
					updatedBy,
				);
			} else if (
				qrCode.config.image &&
				validatedUpdates.config?.image &&
				validatedUpdates.config.image.includes(qrCode.config.image)
			) {
				// if image is the same clear update dto
				validatedUpdates.config.image = qrCode.config.image;
			}
		}

		// delete preview image if config or content changed
		if ((diffs?.config || diffs?.content) && qrCode.previewImage) {
			await this.imageService.deleteImage(qrCode.previewImage);
			validatedUpdates.previewImage = null;
		}

		await this.qrCodeRepository.update(qrCode, validatedUpdates);

		const updatedQrCode = (await this.qrCodeRepository.findOneById(
			qrCode.id,
		)) as TQrCodeWithRelations;

		const event = new QrCodeUpdatedEvent(updatedQrCode);
		this.eventEmitter.emit(event);

		this.logger.info('QR code updated successfully', {
			id: updatedQrCode.id,
			updates: diffs,
			updatedBy,
		});

		return updatedQrCode;
	}
}
