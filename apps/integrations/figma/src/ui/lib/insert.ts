import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import type { InsertFormat, QrImage } from '../../shared/messages';
import type { QrcodlyApi } from './api-client';
import { plugin } from './bridge';

// Rendered large so the image stays sharp at 2–4× exports; Figma caps images at 4096 px.
const PNG_SIZE_PX = 2048;

export async function insertQrCode(
	api: QrcodlyApi,
	qr: TQrCodeWithRelationsResponseDto,
	format: InsertFormat,
): Promise<void> {
	if (!qr.qrCodeData) throw new Error('This QR code has no encodable data yet.');

	const blob = await api.renderQr({
		config: qr.config,
		data: qr.qrCodeData,
		format,
		sizePx: format === 'png' ? PNG_SIZE_PX : undefined,
	});
	const image: QrImage =
		format === 'svg'
			? { format, svg: await blob.text() }
			: { format, bytes: new Uint8Array(await blob.arrayBuffer()) };

	await plugin.insertQrCode({ qrCodeId: qr.id, name: qr.name ?? 'QR code', image });
}
