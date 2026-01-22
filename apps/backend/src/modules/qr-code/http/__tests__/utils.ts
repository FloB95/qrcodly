import { faker } from '@faker-js/faker';
import { QrCodeDefaults, type TCreateQrCodeDto } from '@shared/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext as getGlobalTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';

export const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

export interface TestContext {
	testServer: FastifyInstance;
	accessToken: string;
	accessToken2: string;
	accessTokenPro: string;
}

/**
 * Gets the shared test context.
 * The context is managed globally by test-context.ts.
 */
export const getTestContext = async (): Promise<TestContext> => {
	const ctx = await getGlobalTestContext();
	return {
		testServer: ctx.testServer,
		accessToken: ctx.accessToken,
		accessToken2: ctx.accessToken2,
		accessTokenPro: ctx.accessTokenPro,
	};
};

/**
 * Helper to create a QR code request.
 */
export const createQrCodeRequest = async (
	testServer: FastifyInstance,
	payload?: TCreateQrCodeDto,
	token?: string,
) =>
	testServer.inject({
		method: 'POST',
		url: QR_CODE_API_PATH,
		payload,
		headers: {
			'Content-Type': 'application/json',
			...(token && { Authorization: `Bearer ${token}` }),
		},
	});

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
export const generateEventQrCodeDto = (): TCreateQrCodeDto => {
	const startDate = faker.date.future();
	const endDate = faker.date.future({ refDate: startDate });

	return {
		name: faker.lorem.words(3),
		content: {
			type: 'event',
			data: {
				title: faker.lorem.words(5),
				location: faker.location.city(),
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
				description: faker.lorem.sentence(),
			},
		},
		config: QrCodeDefaults,
	};
};

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
