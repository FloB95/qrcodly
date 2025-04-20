/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { inject, injectable } from 'tsyringe';
import { AbstractCommand } from '@/core/command/abstract.command';
import db from '@/core/db';
import { sql } from 'drizzle-orm';
import { CreateQrCodeDto } from '@shared/schemas';
import { ImageService } from '../services/image.service';
import QrCodeRepository from '../domain/repository/qr-code.repository';

@injectable()
export default class CreateUserCommand extends AbstractCommand {
	constructor(
		@inject(ImageService) private imageService: ImageService,
		@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository,
	) {
		super();
	}

	protected initialize(): void {
		this.command.name('migrate-qr-codes').description('Migrate QR codes');
	}

	protected async execute(options: Record<string, any>): Promise<void> {
		const res = await db.execute(sql`SELECT * FROM qrcodly_qr_code`);
		const oldQrCodes = res[0] as unknown as any[];

		const newQrCodes = oldQrCodes.map((oldQrCode: any) => ({
			id: oldQrCode.id,
			config: {
				width: oldQrCode.config.width,
				height: oldQrCode.config.height,
				margin: oldQrCode.config.margin,
				imageOptions: oldQrCode.config.imageOptions,
				dotsOptions: {
					type: oldQrCode.config.dotsOptions.type,
					style: oldQrCode.config.dotsOptions.color,
				},
				cornersSquareOptions: {
					type: oldQrCode.config.cornersSquareOptions.type,
					style: oldQrCode.config.cornersSquareOptions.color,
				},
				cornersDotOptions: {
					type: oldQrCode.config.cornersDotOptions.type,
					style: oldQrCode.config.cornersDotOptions.color,
				},
				backgroundOptions: {
					style: oldQrCode.config.backgroundOptions.color,
				},
				image: oldQrCode.config.image ?? undefined,
			},
			contentType: oldQrCode.content_type,
			content: oldQrCode.original_data,
			createdAt: oldQrCode.created_at,
			updatedAt: oldQrCode.updated_at,
			createdBy: oldQrCode.created_by,
			previewImage: null,
		}));

		await Promise.all(
			newQrCodes.map(async (newQrCode) => {
				const validatedQrCode = CreateQrCodeDto.safeParse(newQrCode);

				if (!validatedQrCode.success) {
					console.log('Failed to validate QR code', newQrCode.id);
					return;
				}

				const qrCode = {
					id: newQrCode.id,
					...validatedQrCode.data,
					createdBy: newQrCode.createdBy,
					createdAt: new Date(newQrCode.createdAt),
					updatedAt: new Date(newQrCode.updatedAt),
				};

				// convert base64 image to buffer and upload to s3
				if (qrCode.config.image) {
					try {
						qrCode.config.image = await this.imageService.uploadImage(
							qrCode.config.image,
							qrCode.id,
							qrCode.createdBy ?? undefined,
						);
					} catch (error) {
						console.log('Failed to upload image', newQrCode.id, error);
						return;
					}
				}

				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				await this.qrCodeRepository.create(qrCode);
				const qr_code = await this.qrCodeRepository.findOneById(qrCode.id);
				if (!qr_code) {
					console.log('Failed to create QR code', newQrCode.id);
					return;
				}

				// skip if QR code has an image CURRENTLY not supported
				if (qr_code.config.image) {
					return;
				}

				const previewImage = await this.imageService.generatePreview(qr_code);
				if (previewImage) {
					await this.qrCodeRepository.update(qr_code, { previewImage });
				}
			}),
		);
	}
}
