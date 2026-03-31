import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import {
	type TCreateQrCodeDto,
	type TQrCode,
	type TQrCodeOptions,
	QrCodeDefaults,
} from '@shared/schemas';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import ConfigTemplateRepository from '@/modules/config-template/domain/repository/config-template.repository';
import { ImageService } from '@/core/services/image.service';
import { QrCodeCreatedEvent } from '../event/qr-code-created.event';
import { type TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { UnhandledServerError } from '@/core/error/http/unhandled-server.error';
import { CustomApiError, NotFoundError } from '@/core/error/http';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { CreateQrCodePolicy } from '../policies/create-qr-code.policy';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { ShortUrlStrategyService } from '../service/short-url-strategy.service';
import { QrCodeDataService } from '../service/qr-code-data.service';
import { qrCodesCreated } from '@/core/metrics';

/**
 * Use case for creating a QrCode entity.
 * Handles creation, image upload, and optional short URL linking within a transaction.
 */
@injectable()
export class CreateQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(ConfigTemplateRepository) private configTemplateRepository: ConfigTemplateRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(ImageService) private imageService: ImageService,
		@inject(ShortUrlStrategyService) private shortUrlStrategyService: ShortUrlStrategyService,
		@inject(QrCodeDataService) private qrCodeDataService: QrCodeDataService,
	) {}

	/**
	 * Executes the use case to create a new QRcode entity based on the given DTO.
	 * All database operations for core creation and short URL linking are wrapped in a transaction.
	 * @param dto The data transfer object containing the details for the QRcode to be created.
	 * @param user The user object who created the QRcode.
	 * @returns A promise that resolves with the newly created QRcode entity, potentially with linked shortUrl.
	 */
	async execute(dto: TCreateQrCodeDto, user: TUser | undefined): Promise<TQrCodeWithRelations> {
		// handle limitations and access check
		const policy = new CreateQrCodePolicy(user, dto);
		await policy.checkAccess();

		const resolvedConfig = await this.resolveConfig(dto, user);

		let createdImage: string | undefined;

		try {
			return await UnitOfWork.run<TQrCodeWithRelations>(async () => {
				const newId = await this.qrCodeRepository.generateId();

				const qrCodeEntity = {
					id: newId,
					name: dto.name,
					content: dto.content,
					config: { ...resolvedConfig },
					createdBy: user?.id ?? null,
					qrCodeData: null as string | null,
					previewImage: null,
				};

				// Handle image: only upload if it's new base64 data (not an existing S3 path from a template)
				if (qrCodeEntity.config.image && !this.isS3Path(qrCodeEntity.config.image)) {
					const uploaded = await this.imageService.uploadImage(
						qrCodeEntity.config.image,
						newId,
						user?.id ?? undefined,
					);
					createdImage = uploaded;
					qrCodeEntity.config.image = uploaded;
				}

				await this.qrCodeRepository.create(qrCodeEntity);

				// handle url shorting for different content types
				if (qrCodeEntity.createdBy) {
					await this.shortUrlStrategyService.handle(qrCodeEntity as TQrCode);
				}

				// Compute and store qrCodeData (after short URL is created)
				const computedQrCodeData = await this.qrCodeDataService.computeQrCodeData(
					newId,
					qrCodeEntity.content,
				);
				// Update with computed qrCodeData - only id is needed for the where clause
				await this.qrCodeRepository.update({ id: newId } as never, {
					qrCodeData: computedQrCodeData,
				});

				const finalQrCode = await this.qrCodeRepository.findOneById(newId);

				if (!finalQrCode) throw new Error('Failed to retrieve created QR code.');

				this.eventEmitter.emit(new QrCodeCreatedEvent(finalQrCode));
				this.logger.info('qrCode.created', {
					qrCode: {
						id: finalQrCode.id,
						createdBy: finalQrCode.createdBy,
					},
				});
				qrCodesCreated.add(1, { 'content.type': dto.content.type });

				if (user?.id) await policy.incrementUsage();
				return finalQrCode;
			});
		} catch (error: any) {
			this.logger.error('qrCode.created.error', { error });

			// cleanup uploaded image if transaction fails
			if (createdImage) await this.imageService.deleteImage(createdImage);

			if (error instanceof CustomApiError) {
				throw error;
			}

			throw new UnhandledServerError(error as Error, 'QR code creation transaction failed.');
		}
	}

	private async resolveConfig(
		dto: TCreateQrCodeDto,
		user: TUser | undefined,
	): Promise<TQrCodeOptions> {
		if (dto.templateId) {
			const template = await this.configTemplateRepository.findOneById(dto.templateId);
			if (!template) throw new NotFoundError('Template not found');

			// Only allow access to own templates or predefined ones
			if (!template.isPredefined && template.createdBy !== user?.id) {
				throw new NotFoundError('Template not found');
			}

			// Merge: user-provided config fields override template values
			return dto.config ? { ...template.config, ...dto.config } : template.config;
		}

		return dto.config ?? QrCodeDefaults;
	}

	private isS3Path(value: string): boolean {
		return value.includes('/') && !value.startsWith('data:');
	}
}
