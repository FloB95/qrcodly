import { inject, injectable } from 'tsyringe';
import { AbstractCommand } from '@/core/command/abstract.command';
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

	protected async execute(_options: Record<string, any>): Promise<void> {
		const qrCodes = await this.qrCodeRepository.findAll({
			limit: 1000,
			offset: 0,
			where: {
				contentType: {
					eq: 'url',
				},
			},
		});
		await Promise.all(
			qrCodes.map(async (qrcode) => {
				qrcode.content = {
					url: qrcode.content as string,
					isEditable: false,
					isActive: true,
				};

				await this.qrCodeRepository.update(qrcode, {
					content: qrcode.content,
				});
			}),
		);
	}
}
