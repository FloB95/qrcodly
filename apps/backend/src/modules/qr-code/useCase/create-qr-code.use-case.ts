import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TCreateQrCodeDto } from '@shared/schemas';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeCreatedEvent } from '../event/qr-code-created.event';
import { TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import { UpdateShortUrlUseCase } from '@/modules/url-shortener/useCase/update-short-url.use-case';
import { TShortUrl } from '@/modules/url-shortener/domain/entities/short-url.entity';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { CustomApiError } from '@/core/error/http';
import { ShortUrlNotFoundError } from '@/modules/url-shortener/error/http/short-url-not-found.error';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { IUser } from '@/core/interface/user.interface';
import { CreateQrCodePolicy } from '../policies/create-qr-code.policy';

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
	 * @param user The user object who created the QRcode.
	 * @returns A promise that resolves with the newly created QRcode entity, potentially with linked shortUrl.
	 */
	async execute(dto: TCreateQrCodeDto, user: IUser | null): Promise<TQrCodeWithRelations> {
		// handle limitations and access check
		const policy = new CreateQrCodePolicy(user, dto);
		await policy.checkAccess();

		let createdImage: string | undefined;

		try {
			return await UnitOfWork.run<TQrCodeWithRelations>(async () => {
				// generate ID before transaction if not DB-generated
				const newId = await this.qrCodeRepository.generateId();

				const qrCodeData = {
					id: newId,
					...dto,
					createdBy: user?.id ?? null,
					previewImage: null,
				};

				// handle image upload
				if (qrCodeData.config.image) {
					const uploaded = await this.imageService.uploadImage(
						qrCodeData.config.image,
						newId,
						user?.id ?? undefined,
					);
					createdImage = uploaded;
					qrCodeData.config.image = uploaded;
				}

				// handle URL shortening
				let originalUrl: string | null = null;
				let reservedShortUrl: TShortUrl | null = null;

				if (user?.id && qrCodeData.content.type === 'url' && qrCodeData.content.data.isEditable) {
					reservedShortUrl = await this.getReservedShortCodeUseCase.execute(user?.id);

					if (!reservedShortUrl) throw new ShortUrlNotFoundError();

					originalUrl = qrCodeData.content.data.url;
					qrCodeData.content.data.url = buildShortUrl(reservedShortUrl.shortCode);
				}

				// create QR code
				await this.qrCodeRepository.create(qrCodeData);

				// update short URL if needed
				if (originalUrl && reservedShortUrl) {
					await this.updateShortUrlUseCase.execute(
						reservedShortUrl,
						{ destinationUrl: originalUrl, isActive: true },
						user!.id,
						newId,
					);
				}

				const finalQrCode = await this.qrCodeRepository.findOneById(newId);

				if (!finalQrCode) throw new Error('Failed to retrieve created QR code.');

				this.eventEmitter.emit(new QrCodeCreatedEvent(finalQrCode));
				this.logger.info('QR code created successfully', {
					id: finalQrCode.id,
					createdBy: finalQrCode.createdBy,
				});

				if (user?.id) await policy.incrementUsage();
				return finalQrCode as TQrCodeWithRelations;
			});
		} catch (error: any) {
			this.logger.error('Failed to create QR code within transaction', { error });

			// cleanup uploaded image if transaction fails
			if (createdImage) await this.imageService.deleteImage(createdImage);

			if (error instanceof CustomApiError) {
				throw error;
			}

			throw new UnhandledServerError(error as Error, 'QR code creation transaction failed.');
		}
	}
}
