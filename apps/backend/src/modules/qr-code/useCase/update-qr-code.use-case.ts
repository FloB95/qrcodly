import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { TQrCode, TQrCodeWithRelations } from '../domain/entities/qr-code.entity';
import { TUpdateQrCodeDto, UpdateQrCodeDto } from '@shared/schemas';
import { QrCodeUpdatedEvent } from '../event/qr-code-updated.event';
import { EventEmitter } from '@/core/event';

/**
 * Use case for updating the name of an existing QR code.
 */
@injectable()
export class UpdateQrCodeUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
		@inject(Logger) private logger: Logger,
		@inject(EventEmitter) private eventEmitter: EventEmitter,
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
		updatedBy: string | null,
	): Promise<TQrCodeWithRelations> {
		const validatedUpdates: Partial<TQrCode> = UpdateQrCodeDto.parse(updates);
		validatedUpdates.updatedAt = new Date();
		await this.qrCodeRepository.update(qrCode, validatedUpdates);

		const updatedQrCode = (await this.qrCodeRepository.findOneById(
			qrCode.id,
		)) as TQrCodeWithRelations;

		// Emit the creation event *after* the transaction has successfully committed.
		const event = new QrCodeUpdatedEvent(updatedQrCode);
		this.eventEmitter.emit(event);

		// Log success
		this.logger.info('QR code updated successfully', {
			id: updatedQrCode.id,
			updates,
			updatedBy,
		});

		return updatedQrCode;
	}
}
