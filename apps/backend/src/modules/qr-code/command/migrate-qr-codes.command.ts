import { inject, injectable } from 'tsyringe';
import { AbstractCommand } from '@/core/command/abstract.command';
import QrCodeRepository from '../domain/repository/qr-code.repository';
import { TQrCodeContent } from '@shared/schemas';

@injectable()
export default class MigrateQrCodesCommand extends AbstractCommand {
	constructor(@inject(QrCodeRepository) private qrCodeRepository: QrCodeRepository) {
		super();
	}

	protected initialize(): void {
		this.command.name('migrate-qr-codes').description('Migrate QR codes');
	}

	protected async execute(_options: Record<string, any>): Promise<void> {
		const qrCodes = await this.qrCodeRepository.findAll({
			limit: 1000,
			offset: 0,
		});

		await Promise.all(
			qrCodes.map(async (qrcode) => {
				const content: TQrCodeContent = {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					type: qrcode.contentType,
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					data: qrcode.content,
				};

				await this.qrCodeRepository.update(qrcode, {
					content,
				});
			}),
		);
	}
}
