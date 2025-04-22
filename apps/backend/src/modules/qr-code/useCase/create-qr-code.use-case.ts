import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TCreateQrCodeDto } from '@shared/schemas';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeCreatedEvent } from '../event/qr-code-created.event';
import { TQrCode } from '../domain/entities/qr-code.entity';
import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';

/**
 * Use case for creating a QrCode entity.
 */
@injectable()
export class CreateQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
		@inject(GetReservedShortCodeUseCase)
		private getReservedShortCodeUseCase: GetReservedShortCodeUseCase,
		@inject(UpdateShortUrlUseCase) private updateShortUrlUseCase: UpdateShortUrlUseCase,
	) {}

	/**
	 * Executes the use case to create a new QRcode entity based on the given DTO.
	 * @param _dto The data transfer object containing the details for the QRcode to be created.
	 * @param createdBy The ID of the user who created the QRcode.
	 * @returns A promise that resolves with the newly created QRcode entity.
	 */
	async execute(dto: TCreateQrCodeDto, createdBy: string | null): Promise<TQrCode> {
		const newId = await this.qrCodeRepository.generateId();

		const qrCode: Omit<TQrCode, 'createdAt' | 'updatedAt'> = {
			id: newId,
			...dto,
			createdBy,
			previewImage: null,
		};

		// convert base64 image to buffer and upload to s3
		if (qrCode.config.image) {
			qrCode.config.image = await this.imageService.uploadImage(
				qrCode.config.image,
				newId,
				createdBy ?? undefined,
			);
		}

		// handle url shortening
		const { type, data } = qrCode.content;
		let originalUrl = null;
		let shortUrl = null;
		if (createdBy && type === 'url' && data.isEditable) {
			shortUrl = await this.getReservedShortCodeUseCase.execute(createdBy);
			if (shortUrl) {
				originalUrl = qrCode.content.data.url;
				qrCode.content.data.url = buildShortUrl(shortUrl.shortCode);
			} else {
				const errorMessage = 'Failed to get reserved short URL';
				throw new UnhandledServerError(new Error(errorMessage), errorMessage);
			}
		}

		// Create the QR code entity in the database.
		await this.qrCodeRepository.create(qrCode);
		if (originalUrl && shortUrl && createdBy && type === 'url' && data.isEditable) {
			// add qrCode to the shortUrl
			await this.updateShortUrlUseCase.execute(
				shortUrl,
				{
					destinationUrl: originalUrl,
					qrCodeId: newId,
				},
				createdBy,
			);
		}

		// Retrieve the created QR code entity from the database.
		const createdQrCode = await this.qrCodeRepository.findOneById(newId);
		if (!createdQrCode) throw new Error('Failed to create QR code');

		// Emit the QrCodeCreatedEvent.
		const event = new QrCodeCreatedEvent(createdQrCode);
		this.eventEmitter.emit(event);

		this.logger.info('QR code created successfully', {
			id: createdQrCode.id,
			createdBy: createdQrCode.createdBy,
		});

		return createdQrCode;
	}
}
