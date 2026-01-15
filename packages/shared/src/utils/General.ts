import { type Gradient, type Options } from 'qr-code-styling';
import {
	type TQrCodeOptions,
	type TQrCodeContent,
	type TQrCodeContentType,
	type TVCardInput,
	type TWifiInput,
	type TColorOrGradient,
	type TEventInput,
	type TLocationInput,
	type TEmailInput,
} from '../schemas/QrCode';
import VCF from 'vcf';
import ical, { ICalCalendarMethod } from 'ical-generator';

// Utility function to check if all properties of an object are undefined
function areAllPropertiesUndefined(obj: Record<string, any>): boolean {
	return Object.values(obj).every((value) => value === undefined);
}

export function convertVCardObjToString(vCardInput: TVCardInput): string {
	const t = {
		...vCardInput,
	};
	delete t.isDynamic;
	if (areAllPropertiesUndefined(t)) {
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

export const convertEventObjToString = (event: TEventInput) => {
	if (
		areAllPropertiesUndefined(event) ||
		event.startDate === '' ||
		event.endDate === '' ||
		event.title === ''
	) {
		return '';
	}

	const calendar = ical();

	// A method is required for outlook to display event as an invitation
	calendar.method(ICalCalendarMethod.PUBLISH);
	calendar.createEvent({
		start: event.startDate,
		end: event.endDate,
		summary: event.title,
		description: event.description,
		location: event.location,
		url: event.url,
	});

	return calendar.toString();
};

export const convertLocationObjToString = (location: TLocationInput) => {
	const { latitude, longitude, address } = location;
	const query = encodeURIComponent(address ?? '');

	// If coordinates exist → use them
	if (latitude != null && longitude != null) {
		return `geo:${latitude},${longitude}?q=${query}`;
	}

	if (!address) {
		return '';
	}

	return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export const convertEmailObjToString = (emailObj: TEmailInput) => {
	if (areAllPropertiesUndefined(emailObj) || emailObj.email === '') {
		return '';
	}

	const { email, subject, body } = emailObj;
	const encodedSubject = subject ? encodeURIComponent(subject) : '';
	const encodedBody = body ? encodeURIComponent(body) : '';
	return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
};

export const convertQRCodeDataToStringByType = (
	content: TQrCodeContent,
	shortUrl?: string,
): string => {
	switch (content.type) {
		case 'url': {
			const { url, isEditable } = content.data as unknown as any;
			return shortUrl && isEditable ? shortUrl : url;
		}
		case 'text':
			return content.data;
		case 'wifi':
			return convertWiFiObjToString(content.data);
		case 'vCard': {
			const { isDynamic } = content.data as unknown as any;
			return shortUrl && isDynamic ? shortUrl : convertVCardObjToString(content.data);
		}
		case 'email':
			return convertEmailObjToString(content.data);
		case 'location':
			return convertLocationObjToString(content.data);
		case 'event':
			return shortUrl ?? '';
		default:
			throw new Error('Invalid content type');
	}
};

export const isDynamic = (content: TQrCodeContent): boolean => {
	const dynamicTypes: TQrCodeContentType[] = ['event'];

	if (dynamicTypes.includes(content.type)) {
		return true;
	}

	if (content.type === 'url') {
		return content.data.isEditable === true;
	}

	if (content.type === 'vCard') {
		return content.data.isDynamic === true;
	}

	return false;
};

export const getDefaultContentByType = (
	type: TQrCodeContentType,
	isSignedIn = false,
): TQrCodeContent => {
	switch (type) {
		case 'url':
			return {
				type: 'url',
				data: {
					url: '',
					isEditable: isSignedIn,
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
					isDynamic: isSignedIn,
				},
			};
		case 'email':
			return {
				type: 'email',
				data: {
					email: '',
					subject: '',
					body: '',
				},
			};
		case 'location':
			return {
				type: 'location',
				data: {
					address: '',
				},
			};
		case 'event':
			return {
				type: 'event',
				data: {
					endDate: '',
					startDate: '',
					title: '',
				},
			};
		// case 'socials':
		// 	return {
		// 		type: 'socials',
		// 		data: {
		// 			title: '',
		// 			links: [],
		// 		},
		// 	};
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
			return { color: option.value, gradient: undefined };
		case 'rgba':
			return { color: option.value, gradient: undefined };
		case 'gradient':
			return {
				color: undefined,
				gradient: {
					type: option.gradientType,
					colorStops: option.colorStops,
					rotation: option.rotation ? (option.rotation - 90 + 360) % 360 : undefined,
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

	const keys = new Set([...Object.keys(obj1 ?? {}), ...Object.keys(obj2 ?? {})]);

	for (const key of keys) {
		if (ignoreProperties.includes(key)) continue;

		const val1 = obj1?.[key];
		const val2 = obj2?.[key];

		// Key added
		if (val1 === undefined && val2 !== undefined) {
			diff[key] = { oldValue: undefined, newValue: val2 };
			continue;
		}

		// Key removed
		if (val1 !== undefined && val2 === undefined) {
			diff[key] = { oldValue: val1, newValue: undefined };
			continue;
		}

		// Both objects
		if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
			const nestedDiff = objDiff(val1, val2, []);
			if (Object.keys(nestedDiff).length > 0) {
				diff[key] = nestedDiff;
			}
			continue;
		}

		// Primitive change
		if (!deepEqual(val1, val2)) {
			diff[key] = { oldValue: val1, newValue: val2 };
		}
	}

	return diff;
}
