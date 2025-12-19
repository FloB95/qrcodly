import { type Gradient, type Options } from 'qr-code-styling';
import {
	type TQrCodeOptions,
	type TQrCodeContent,
	type TQrCodeContentType,
	type TVCardInput,
	type TWifiInput,
	type TColorOrGradient,
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
	vCard.version = '3.0';

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
	if (areAllPropertiesUndefined(wiFiInput) || wiFiInput.ssid === '') {
		return '';
	}

	const wifiString = `WIFI:T:${wiFiInput.encryption};S:${wiFiInput.ssid};P:${wiFiInput.password};;`;
	return wifiString;
}

export const convertQRCodeDataToStringByType = (content: TQrCodeContent): string => {
	switch (content.type) {
		case 'url':
			const { url, isEditable, shortUrl } = content.data as unknown as any;
			return shortUrl && isEditable ? shortUrl : url;
		case 'text':
			return content.data;
		case 'wifi':
			return convertWiFiObjToString(content.data);
		case 'vCard':
			return convertVCardObjToString(content.data);
		default:
			throw new Error('Invalid content type');
	}
};

export const getDefaultContentByType = (type: TQrCodeContentType): TQrCodeContent => {
	switch (type) {
		case 'url':
			return {
				type: 'url',
				data: {
					url: '',
					isEditable: false,
				},
			};
		case 'text':
			return {
				type: 'text',
				data: '',
			};
		case 'wifi':
			return {
				type: 'wifi',
				data: {
					ssid: '',
					encryption: 'WPA',
					password: '',
				},
			};
		case 'vCard':
			return {
				type: 'vCard',
				data: {
					firstName: undefined,
					lastName: undefined,
					email: undefined,
					phone: undefined,
					fax: undefined,
					company: undefined,
					job: undefined,
					street: undefined,
					city: undefined,
					zip: undefined,
					state: undefined,
					country: undefined,
					website: undefined,
				},
			};
		default:
			throw new Error('Invalid content type');
	}
};

export function degreesToRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

function mapColorOrGradientToLibrary(option: TColorOrGradient): {
	color?: string;
	gradient?: Gradient;
} {
	switch (option.type) {
		case 'hex':
			return { color: option.value };
		case 'rgba':
			return { color: option.value };
		case 'gradient':
			return {
				gradient: {
					type: option.gradientType,
					colorStops: option.colorStops,
					rotation: (option.rotation - 90 + 360) % 360,
				},
			};
	}
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
			margin: 30,
			crossOrigin: 'anonymous',
			saveAsBlob: true,
		},
		dotsOptions: {
			...mapColorOrGradientToLibrary(options.dotsOptions.style),
			type: options.dotsOptions.type,
		},
		backgroundOptions: {
			...mapColorOrGradientToLibrary(options.backgroundOptions.style),
		},
		cornersSquareOptions: {
			...mapColorOrGradientToLibrary(options.cornersSquareOptions.style),
			type: options.cornersSquareOptions.type,
		},
		cornersDotOptions: {
			...mapColorOrGradientToLibrary(options.cornersDotOptions.style),
			type: options.cornersDotOptions.type,
		},
	};
}

/**
 * Compares two values for deep equality.
 * @param {*} value1 - The first value to compare.
 * @param {*} value2 - The second value to compare.
 * @returns {boolean} - Returns true if the values are deeply equal, otherwise false.
 */
function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((item, index) => deepEqual(item, b[index]));
	}
	if (Array.isArray(a) !== Array.isArray(b)) return false;

	const keysA = Object.keys(a).sort();
	const keysB = Object.keys(b).sort();
	if (keysA.length !== keysB.length) return false;
	if (!keysA.every((key, i) => key === keysB[i])) return false;

	return keysA.every((key) => deepEqual(a[key], b[key]));
}

/**
 * Computes the difference between two objects.
 * @param {Object} obj1 - The first object.
 * @param {Object} obj2 - The second object.
 * @param {Array<string>} [ignoreProperties=[]] - An array of property names to ignore.
 * @returns {Object} - An object representing the differences. Each key in the returned object
 *                     corresponds to a property that differs between obj1 and obj2, with the
 *                     old and new values.
 */
export function objDiff(obj1: any, obj2: any, ignoreProperties: string[] = []): any {
	const diff: any = {};

	for (const key in obj1) {
		if (ignoreProperties.includes(key)) continue;

		const val1 = obj1[key];
		const val2 = obj2[key];

		if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
			if (Array.isArray(val1) && Array.isArray(val2)) {
				// Arrays: nur Unterschiede speichern
				const arrayDiffs = val1
					.map((item, index) => {
						if (val2[index] === undefined) return { oldValue: item, newValue: undefined };
						if (!deepEqual(item, val2[index])) {
							if (typeof item === 'object' && typeof val2[index] === 'object') {
								return objDiff(item, val2[index]);
							}
							return { oldValue: item, newValue: val2[index] };
						}
						return null;
					})
					.filter(Boolean);

				if (arrayDiffs.length > 0) {
					diff[key] = arrayDiffs;
				}
			} else {
				// Objekte: rekursiv prüfen
				const nestedDiff = objDiff(val1, val2, []);
				if (Object.keys(nestedDiff).length > 0) {
					diff[key] = nestedDiff;
				}
			}
		} else if (!deepEqual(val1, val2)) {
			diff[key] = { oldValue: val1, newValue: val2 };
		}
	}

	return diff;
}
