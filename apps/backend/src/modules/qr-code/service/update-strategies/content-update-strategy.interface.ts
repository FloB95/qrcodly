import { type TQrCode } from '../../domain/entities/qr-code.entity';

export interface IContentUpdateStrategy {
	supports(contentType: string): boolean;
	handleContentUpdate(qrCode: TQrCode, updates: Partial<TQrCode>): Promise<void>;
}
