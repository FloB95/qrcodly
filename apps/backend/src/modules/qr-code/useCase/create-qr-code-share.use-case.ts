import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@/core/logging';
import { TCreateQrCodeShareDto, TQrCodeShareConfig } from '@shared/schemas';
import QrCodeShareRepository from '../domain/repository/qr-code-share.repository';
import { TQrCodeShare } from '../domain/entities/qr-code-share.entity';
import { QrCodeShareAlreadyExistsError } from '../error/http/qr-code-share-already-exists.error';
import { v4 as uuidv4 } from 'uuid';

/**
 * Use case for creating a QR Code share link.
 */
@injectable()
export class CreateQrCodeShareUseCase implements IBaseUseCase {
	constructor(
		@inject(QrCodeShareRepository) private qrCodeShareRepository: QrCodeShareRepository,
		@inject(Logger) private logger: Logger,
	) {}

	/**
	 * Creates a new share link for a QR code.
	 * @param qrCodeId - The ID of the QR code to share.
	 * @param userId - The ID of the user creating the share.
	 * @param dto - Optional configuration for the share.
	 * @returns The created share entity.
	 * @throws QrCodeShareAlreadyExistsError if a share already exists for this QR code.
	 */
	async execute(
		qrCodeId: string,
		userId: string,
		dto?: TCreateQrCodeShareDto,
	): Promise<TQrCodeShare> {
		const shareToken = uuidv4();
		const newId = await this.qrCodeShareRepository.generateId();

		const defaultConfig: TQrCodeShareConfig = {
			showName: true,
			showDownloadButton: true,
		};

		const config = dto ? { ...defaultConfig, ...dto } : defaultConfig;

		const share: Omit<TQrCodeShare, 'createdAt' | 'updatedAt'> = {
			id: newId,
			qrCodeId,
			shareToken,
			config,
			isActive: true,
			createdBy: userId,
		};

		try {
			await this.qrCodeShareRepository.create(share);
		} catch (error) {
			// MySQL error code 1062 = ER_DUP_ENTRY (duplicate key violation)
			if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
				throw new QrCodeShareAlreadyExistsError();
			}
			throw error;
		}

		this.logger.info('qrCodeShare.created', {
			sharedQrCode: {
				shareId: newId,
				qrCodeId,
				createdBy: userId,
			},
		});

		const createdShare = await this.qrCodeShareRepository.findByQrCodeId(qrCodeId);
		if (!createdShare) {
			throw new Error('Failed to retrieve created share link.');
		}

		return createdShare;
	}
}
