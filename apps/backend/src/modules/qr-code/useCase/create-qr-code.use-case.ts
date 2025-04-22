import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TCreateQrCodeDto } from '@shared/schemas';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeCreatedEvent } from '../event/qr-code-created.event';
import { TQrCode } from '../domain/entities/qr-code.entity'; // Assuming this type includes the shortUrl relation now
import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import db from '@/core/db'; // Import the DB instance for transactions
import { TShortUrl } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/qr-code-not-found.error'; // Assuming this is the correct error import

/**
 * Use case for creating a QrCode entity.
 * Handles creation, image upload, and optional short URL linking within a transaction.
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
	 * All database operations for core creation and short URL linking are wrapped in a transaction.
	 * @param dto The data transfer object containing the details for the QRcode to be created.
	 * @param createdBy The ID of the user who created the QRcode.
	 * @returns A promise that resolves with the newly created QRcode entity, potentially with linked shortUrl.
	 */
	async execute(
		dto: TCreateQrCodeDto,
		createdBy: string | null,
	): Promise<TQrCode & { shortUrl: TShortUrl | null }> {
		// Generate ID before the transaction if not database-generated
		const newId = await this.qrCodeRepository.generateId();

		let createdQrCodeWithShortUrl: TQrCode & { shortUrl: TShortUrl | null };

		try {
			// Wrap all critical operations in a database transaction for atomicity.
			// If any error is thrown within this async function, Drizzle will automatically perform a transaction rollback.
			createdQrCodeWithShortUrl = await db.transaction(async () => {
				const qrCodeData: Omit<TQrCode, 'createdAt' | 'updatedAt'> = {
					id: newId,
					...dto,
					createdBy,
					previewImage: null, // Set initial value
				};

				// Handle base64 image upload if provided. Error here will rollback transaction.
				if (qrCodeData.config.image) {
					qrCodeData.config.image = await this.imageService.uploadImage(
						qrCodeData.config.image,
						newId,
						createdBy ?? undefined,
					);
				}

				// Handle URL shortening logic specifically for 'url' type and editable content
				let originalUrlToLink: string | null = null;
				let reservedShortUrl: TShortUrl | null = null;

				if (createdBy && qrCodeData.content.type === 'url' && qrCodeData.content.data.isEditable) {
					reservedShortUrl = await this.getReservedShortCodeUseCase.execute(createdBy);

					if (!reservedShortUrl) {
						// Throw specific error to signal business failure and trigger rollback
						throw new ShortUrlNotFoundError();
					}

					// Store original URL and update QR code content URL to the short URL
					originalUrlToLink = qrCodeData.content.data.url;
					qrCodeData.content.data.url = buildShortUrl(reservedShortUrl.shortCode);
				}

				// Create the QR code entity in the database.
				await this.qrCodeRepository.create(qrCodeData);

				// Link the reserved short URL if URL shortening was applied
				if (originalUrlToLink && reservedShortUrl) {
					await this.updateShortUrlUseCase.execute(
						reservedShortUrl,
						{
							destinationUrl: originalUrlToLink,
							qrCodeId: newId,
						},
						createdBy!,
					);
				}

				const finalQrCode = await this.qrCodeRepository.findOneById(newId);

				if (!finalQrCode) {
					throw new Error('Failed to retrieve created QR code within transaction.');
				}

				return finalQrCode as TQrCode & { shortUrl: TShortUrl | null };
			});
		} catch (error) {
			this.logger.error('Failed to create QR code within transaction', { error });

			if (error instanceof ShortUrlNotFoundError) {
				throw error; // Let specific business error propagate
			}

			throw new UnhandledServerError(error as Error, 'QR code creation transaction failed.');
		}

		// Emit the creation event *after* the transaction has successfully committed.
		const event = new QrCodeCreatedEvent(createdQrCodeWithShortUrl);
		this.eventEmitter.emit(event);

		// Log success
		this.logger.info('QR code created successfully', {
			id: createdQrCodeWithShortUrl.id,
			createdBy: createdQrCodeWithShortUrl.createdBy,
		});

		return createdQrCodeWithShortUrl;
	}
}
