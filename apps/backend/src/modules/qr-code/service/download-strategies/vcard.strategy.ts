import { singleton } from 'tsyringe';
import { type TQrCodeContent, type TVCardInput, convertVCardObjToString } from '@shared/schemas';
import { type IDownloadResponse, type IDownloadStrategy } from './download-strategy.interface';
import { type TQrCode } from '@/modules/qr-code/domain/entities/qr-code.entity';

@singleton()
export class VCardDownloadStrategy implements IDownloadStrategy {
	appliesTo(content: TQrCodeContent): boolean {
		return content.type === 'vCard';
	}

	handle(qrCode: TQrCode): IDownloadResponse {
		if (qrCode.content.type !== 'vCard') {
			throw new Error('VCardDownloadStrategy can only handle vCard type QR codes');
		}

		const vCardData = qrCode.content.data as TVCardInput;
		const vCardString = convertVCardObjToString(vCardData);

		const firstName = vCardData.firstName || '';
		const lastName = vCardData.lastName || '';
		const filename = `${firstName} ${lastName}`.trim() || 'contact';

		return {
			content: vCardString,
			contentType: 'text/vcard;charset=utf-8',
			filename: `${filename}.vcf`,
		};
	}
}
