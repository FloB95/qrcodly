import { faker } from '@faker-js/faker';
import { QrCodeDefaults, type TCreateQrCodeDto } from '@shared/schemas';

/**
 * Generates a new random QR code DTO.
 */
export const generateQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'url',
		data: {
			url: faker.internet.url(),
			isEditable: false, // TODO add as param
		},
	},
	config: QrCodeDefaults,
});

/**
 * Generates an event QR code DTO.
 */
export const generateEventQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'event',
		data: {
			title: faker.lorem.words(5),
			location: faker.location.city(),
			startDate: faker.date.future().toISOString(),
			endDate: faker.date.future().toISOString(),
			description: faker.lorem.sentence(),
		},
	},
	config: QrCodeDefaults,
});

/**
 * Generates a WiFi QR code DTO.
 */
export const generateWifiQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'wifi',
		data: {
			ssid: faker.internet.domainWord(),
			password: faker.internet.password(),
			encryption: 'WPA',
		},
	},
	config: QrCodeDefaults,
});

/**
 * Generates a vCard QR code DTO.
 */
export const generateVCardQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'vCard',
		data: {
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			email: faker.internet.email(),
			phoneMobile: `+${faker.number.int({ min: 1, max: 9999 })}${faker.number.int({ min: 100000, max: 999999999999999 })}`,
			company: faker.company.name(),
		},
	},
	config: QrCodeDefaults,
});

/**
 * Generates a text QR code DTO.
 */
export const generateTextQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'text',
		data: faker.lorem.paragraph(),
	},
	config: QrCodeDefaults,
});

/**
 * Generates an editable URL QR code DTO.
 */
export const generateEditableUrlQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'url',
		data: {
			url: faker.internet.url(),
			isEditable: true,
		},
	},
	config: QrCodeDefaults,
});

/**
 * Generates a dynamic vCard QR code DTO.
 */
export const generateDynamicVCardQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'vCard',
		data: {
			firstName: faker.person.firstName(),
			lastName: faker.person.lastName(),
			email: faker.internet.email(),
			phoneMobile: `+${faker.number.int({ min: 1, max: 9999 })}${faker.number.int({ min: 100000, max: 999999999999999 })}`,
			company: faker.company.name(),
			isDynamic: true,
		},
	},
	config: QrCodeDefaults,
});

/**
 * Generates an email QR code DTO.
 */
export const generateEmailQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'email',
		data: {
			email: faker.internet.email(),
			subject: faker.lorem.sentence(),
			body: faker.lorem.paragraph(),
		},
	},
	config: QrCodeDefaults,
});

/**
 * Generates a location QR code DTO.
 */
export const generateLocationQrCodeDto = (): TCreateQrCodeDto => ({
	name: faker.lorem.words(3),
	content: {
		type: 'location',
		data: {
			latitude: faker.location.latitude(),
			longitude: faker.location.longitude(),
			address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
		},
	},
	config: QrCodeDefaults,
});
