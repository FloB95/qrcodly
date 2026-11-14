import { faker } from '@faker-js/faker';

/**
 * Generates CSV content for URL QR codes bulk import.
 */
export const generateUrlCsv = (rows: number = 3): string => {
	const header = 'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\n';
	const dataRows = Array.from(
		{ length: rows },
		() => `${faker.internet.url()};${faker.lorem.words(2)};0`,
	).join('\n');
	return header + dataRows;
};

/**
 * Generates CSV content for Text QR codes bulk import.
 */
export const generateTextCsv = (rows: number = 3): string => {
	const header = 'Text;Name\n';
	const dataRows = Array.from(
		{ length: rows },
		() => `${faker.lorem.sentence()};${faker.lorem.words(2)}`,
	).join('\n');
	return header + dataRows;
};

/**
 * Generates CSV content for WiFi QR codes bulk import.
 */
export const generateWifiCsv = (rows: number = 3): string => {
	const header = 'SSID;Password;Encryption (WPA, WEP, nopass);Name\n';
	const dataRows = Array.from(
		{ length: rows },
		() => `${faker.internet.domainWord()};${faker.internet.password()};WPA;${faker.lorem.words(2)}`,
	).join('\n');
	return header + dataRows;
};

/**
 * Generates CSV content for vCard QR codes bulk import.
 */
export const generateVCardCsv = (rows: number = 3): string => {
	const header =
		'QR Code Name;Title;FirstName;LastName;EmailPrivate;EmailBusiness;PhonePrivate;PhoneMobile;PhoneBusiness;Fax;Company;Job;StreetPrivate;CityPrivate;ZIPPrivate;StatePrivate;CountryPrivate;StreetBusiness;CityBusiness;ZIPBusiness;StateBusiness;CountryBusiness;Website;Note;Dynamic (1 = true, 0 = false)\n';
	const dataRows = Array.from({ length: rows }, () => {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		return `${firstName} ${lastName};Dr.;${firstName};${lastName};${faker.internet.email()};;+1${faker.number.int({ min: 1000000000, max: 9999999999 })};;;;${faker.company.name()};${faker.person.jobTitle()};${faker.location.streetAddress()};${faker.location.city()};${faker.location.zipCode()};${faker.location.state()};${faker.location.country()};${faker.location.streetAddress()};${faker.location.city()};${faker.location.zipCode()};${faker.location.state()};${faker.location.country()};${faker.internet.url()};${faker.lorem.sentence()};0`;
	}).join('\n');
	return header + dataRows;
};

const generateInternationalPhone = () =>
	`+49 170 ${faker.number.int({ min: 1000000, max: 9999999 })}`;

/**
 * Generates CSV content for Phone QR codes bulk import.
 */
export const generatePhoneCsv = (rows: number = 3): string => {
	const header = 'Phone Number;Name\n';
	const dataRows = Array.from(
		{ length: rows },
		() => `${generateInternationalPhone()};${faker.lorem.words(2)}`,
	).join('\n');
	return header + dataRows;
};

/**
 * Generates CSV content for SMS QR codes bulk import.
 */
export const generateSmsCsv = (rows: number = 3): string => {
	const header = 'Phone Number;Message;Name\n';
	const dataRows = Array.from(
		{ length: rows },
		() => `${generateInternationalPhone()};${faker.lorem.sentence()};${faker.lorem.words(2)}`,
	).join('\n');
	return header + dataRows;
};

/**
 * Generates CSV content for WhatsApp QR codes bulk import.
 */
export const generateWhatsAppCsv = (rows: number = 3): string => {
	const header = 'Phone Number (international, e.g. +491701234567);Message;Name\n';
	const dataRows = Array.from(
		{ length: rows },
		() => `${generateInternationalPhone()};${faker.lorem.sentence()};${faker.lorem.words(2)}`,
	).join('\n');
	return header + dataRows;
};

/**
 * Generates invalid CSV for error testing.
 */
export const generateInvalidCsv = (): string => {
	return (
		'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\n' +
		'invalid-url;Test;not-a-boolean\n'
	);
};

/**
 * Generates CSV with too many rows (exceeds MAX_QR_CODE_CSV_UPLOADS limit).
 */
export const generateOversizedCsv = (limit: number = 100): string => {
	return generateUrlCsv(limit + 1);
};
