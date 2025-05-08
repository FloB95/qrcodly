import { faker } from '@faker-js/faker/.';
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
