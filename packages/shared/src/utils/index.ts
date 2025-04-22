import { type Options } from 'qr-code-styling';
import {
	type TQrCodeOptions,
	type TQrCodeContent,
	type TQrCodeContentType,
	type TVCardInput,
	type TWifiInput,
	type TUrlInput,
} from '../schemas/QrCode';
import VCF from 'vcf';

// Utility function to check if all properties of an object are undefined
function areAllPropertiesUndefined(obj: Record<string, any>): boolean {
	return Object.values(obj).every((value) => value === undefined);
}

export function convertVCardObjToString(vCardInput: TVCardInput): string {
	if (areAllPropertiesUndefined(vCardInput)) {
		return '';
	}

	const vCard = new VCF();

	if (vCardInput.firstName || vCardInput.lastName) {
		vCard.add('n', `${vCardInput.lastName || ''};${vCardInput.firstName || ''}`);
	}
	if (vCardInput.email) {
		vCard.add('email', vCardInput.email);
	}
	if (vCardInput.phone) {
		vCard.add('tel', vCardInput.phone, { type: 'cell' });
	}
	if (vCardInput.fax) {
		vCard.add('tel', vCardInput.fax, { type: 'fax' });
	}
	if (vCardInput.company) {
		vCard.add('org', vCardInput.company);
	}
	if (vCardInput.job) {
		vCard.add('title', vCardInput.job);
	}
	if (
		vCardInput.street ||
		vCardInput.city ||
		vCardInput.zip ||
		vCardInput.state ||
		vCardInput.country
	) {
		const address = [
			'',
			'',
			vCardInput.street || '',
			vCardInput.city || '',
			vCardInput.state || '',
			vCardInput.zip || '',
			vCardInput.country || '',
		].join(';');
		vCard.add('adr', address);
	}
	if (vCardInput.website) {
		vCard.add('url', vCardInput.website);
	}

	return vCard.toString();
}

export function convertWiFiObjToString(wiFiInput: TWifiInput): string {
	if (areAllPropertiesUndefined(wiFiInput)) {
		return '';
	}

	const wifiString = `WIFI:T:${wiFiInput.encryption};S:${wiFiInput.ssid};P:${wiFiInput.password};;`;
	return wifiString;
}

export const convertQRCodeDataToStringByType = (
	data: TQrCodeContent,
	contentType: TQrCodeContentType,
): string => {
	switch (contentType) {
		case 'url':
			const { shortUrl, url, isEditable } = data as TUrlInput;
			return shortUrl && isEditable ? shortUrl : url;
		case 'text':
			return data as string;
		case 'wifi':
			return convertWiFiObjToString(data as TWifiInput);
		case 'vCard':
			return convertVCardObjToString(data as TVCardInput);
		default:
			throw new Error('Invalid content type');
	}
};

export function degreesToRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

export function convertQrCodeOptionsToLibraryOptions(options: TQrCodeOptions): Options {
	return {
		shape: 'square',
		width: options.width,
		height: options.height,
		image: options.image,
		type: 'canvas',
		margin: options.margin,
		qrOptions: {
			typeNumber: 0,
			mode: 'Byte',
			errorCorrectionLevel: 'Q',
		},
		imageOptions: {
			hideBackgroundDots: options.imageOptions.hideBackgroundDots,
			imageSize: 0.4,
			margin: 40,
			crossOrigin: 'anonymous',
		},
		dotsOptions: {
			...(typeof options.dotsOptions.style === 'object'
				? {
						gradient: {
							...options.dotsOptions.style,
							rotation: degreesToRadians((options.dotsOptions.style.rotation - 90) % 360),
						},
						color: undefined,
					}
				: { color: options.dotsOptions.style, gradient: undefined }),
			type: options.dotsOptions.type,
		},
		backgroundOptions: {
			...(typeof options.backgroundOptions.style === 'object'
				? {
						gradient: {
							...options.backgroundOptions.style,
							rotation: degreesToRadians(
								(options.backgroundOptions.style.rotation - 90 + 360) % 360,
							),
						},
						color: undefined,
					}
				: { color: options.backgroundOptions.style, gradient: undefined }),
		},
		cornersSquareOptions: {
			...(typeof options.cornersSquareOptions.style === 'object'
				? {
						gradient: {
							...options.cornersSquareOptions.style,
							rotation: degreesToRadians(
								(options.cornersSquareOptions.style.rotation - 90 + 360) % 360,
							),
						},
						color: undefined,
					}
				: { color: options.cornersSquareOptions.style, gradien: undefined }),
			type: options.cornersSquareOptions.type,
		},
		cornersDotOptions: {
			...(typeof options.cornersDotOptions.style === 'object'
				? {
						gradient: {
							...options.cornersDotOptions.style,
							rotation: degreesToRadians(
								(options.cornersDotOptions.style.rotation - 90 + 360) % 360,
							),
						},
						color: undefined,
					}
				: { color: options.cornersDotOptions.style, gradient: undefined }),
			type: options.cornersDotOptions.type,
		},
	};
}
