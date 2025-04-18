import {
	type TQrCodeContent,
	type TQrCodeContentType,
	type TVCardInput,
	type TWifiInput,
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
			return data as string;
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
