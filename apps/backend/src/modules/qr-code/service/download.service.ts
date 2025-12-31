import { singleton } from 'tsyringe';
import { type TQrCode } from '@/modules/qr-code/domain/entities/qr-code.entity';
import { EventDownloadStrategy } from './download-strategies/event.strategy';
import { VCardDownloadStrategy } from './download-strategies/vcard.strategy';
import { type IDownloadResponse } from './download-strategies/download-strategy.interface';

@singleton()
export class DownloadService {
	private readonly strategies = [new EventDownloadStrategy(), new VCardDownloadStrategy()];

	async handle(qrCode: TQrCode): Promise<IDownloadResponse | null> {
		for (const strategy of this.strategies) {
			if (strategy.appliesTo(qrCode.content)) {
				return await strategy.handle(qrCode);
			}
		}

		return null;
	}
}
