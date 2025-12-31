import { type TQrCodeContent } from '@shared/schemas';
import { type TQrCode } from '@/modules/qr-code/domain/entities/qr-code.entity';

export interface IDownloadResponse {
	content: string;
	contentType: string;
	filename: string;
}

export interface IDownloadStrategy {
	appliesTo(content: TQrCodeContent): boolean;
	handle(qrCode: TQrCode): IDownloadResponse;
}
