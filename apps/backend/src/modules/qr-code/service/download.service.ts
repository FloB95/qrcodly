import { inject, singleton } from 'tsyringe';
import { type TQrCode } from '@/modules/qr-code/domain/entities/qr-code.entity';
import { EventDownloadStrategy } from './download-strategies/event.strategy';
import { VCardDownloadStrategy } from './download-strategies/vcard.strategy';
import { type IDownloadResponse } from './download-strategies/download-strategy.interface';

@singleton()
export class DownloadService {
	private readonly strategies;

	constructor(
		@inject(EventDownloadStrategy) eventStrategy: EventDownloadStrategy,
		@inject(VCardDownloadStrategy) vCardStrategy: VCardDownloadStrategy,
	) {
		this.strategies = [eventStrategy, vCardStrategy];
	}

	handle(qrCode: TQrCode): IDownloadResponse | null {
		for (const strategy of this.strategies) {
			if (strategy.appliesTo(qrCode.content)) {
				return strategy.handle(qrCode);
			}
		}

		return null;
	}

	sanitizeAsciiFilename(filename: string): string {
		return filename.normalize('NFKD').replace(/[^\w.-]+/g, '_');
	}

	encodeRFC5987ValueChars(str: string): string {
		return encodeURIComponent(str)
			.replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16)}`)
			.replace(/%(7C|60|5E)/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
	}
}
