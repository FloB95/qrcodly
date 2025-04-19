import { IBaseUseCase } from '@/core/interface/IBaseUseCase';
import { inject, injectable } from 'tsyringe';
import QrCodeRepository from '../../domain/repository/QrCodeRepository';
import { Logger } from '@/core/logging';
import { EventEmitter } from '@/core/event';
import { TQrCode } from '../../domain/entities/QrCode';
import { QrCodeCreatedEvent } from '../../event/QrCodeCreatedEvent';
import { TCreateQrCodeDto } from '@shared/schemas';
import { QrCodeService } from '../../services/QrCodeService';

/**
 * Use case for creating a QrCode entity.
 */
@injectable()
export class CreateQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
		@inject(QrCodeService) private qrCodeService: QrCodeService,
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
		qrCode.config.image = await this.qrCodeService.uploadQrCodeImage(qrCode);

		// Create the QR code entity in the database.
		await this.qrCodeRepository.create(qrCode);

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
