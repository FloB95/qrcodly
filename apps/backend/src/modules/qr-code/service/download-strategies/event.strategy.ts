import { singleton } from 'tsyringe';
import { type TQrCodeContent, type TEventInput, convertEventObjToString } from '@shared/schemas';
import { type IDownloadResponse, type IDownloadStrategy } from './download-strategy.interface';
import { type TQrCode } from '@/modules/qr-code/domain/entities/qr-code.entity';

@singleton()
export class EventDownloadStrategy implements IDownloadStrategy {
	appliesTo(content: TQrCodeContent): boolean {
		return content.type === 'event';
	}

	handle(qrCode: TQrCode): IDownloadResponse {
		if (qrCode.content.type !== 'event') {
			throw new Error('EventDownloadStrategy can only handle event type QR codes');
		}

		const eventData = qrCode.content.data as TEventInput;
		const iCalString = convertEventObjToString(eventData);

		return {
			content: iCalString,
			contentType: 'text/calendar;charset=utf-8',
			filename: `${eventData.title || 'event'}.ics`,
		};
	}
}
