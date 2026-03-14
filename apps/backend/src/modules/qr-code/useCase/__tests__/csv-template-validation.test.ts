import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { BulkUrlCsvDto } from '../../domain/dtos/BulkUrlCsvDto';
import { BulkTextCsvDto } from '../../domain/dtos/BulkTextCsvDto';
import { BulkWifiCsvDto } from '../../domain/dtos/BulkWifiCsvDto';
import { BulkVCardCsvDto } from '../../domain/dtos/BulkVCardCsvDto';
import { QrCodeContent } from '@shared/schemas';
import type { ZodObject } from 'zod';

const CSV_TEMPLATES_DIR = path.resolve(
	__dirname,
	'../../../../../../frontend/public/csv-templates',
);

const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'nl', 'pl', 'ru'] as const;

const CONTENT_TYPE_CONFIG: Record<
	string,
	{
		columns: string[];
		schema: ZodObject;
		filePrefix: string;
	}
> = {
	url: {
		columns: ['url', 'name', 'isEditable'],
		schema: BulkUrlCsvDto,
		filePrefix: 'qrcodly-import-url',
	},
	text: {
		columns: ['text', 'name'],
		schema: BulkTextCsvDto,
		filePrefix: 'qrcodly-import-text',
	},
	wifi: {
		columns: ['ssid', 'password', 'encryption', 'name'],
		schema: BulkWifiCsvDto,
		filePrefix: 'qrcodly-import-wifi',
	},
	vCard: {
		columns: [
			'name',
			'firstName',
			'lastName',
			'emailPrivate',
			'emailBusiness',
			'phonePrivate',
			'phoneMobile',
			'phoneBusiness',
			'fax',
			'company',
			'job',
			'street',
			'city',
			'zip',
			'state',
			'country',
			'website',
			'isDynamic',
		],
		schema: BulkVCardCsvDto,
		filePrefix: 'qrcodly-import-vcard',
	},
};

describe('CSV Template Validation', () => {
	it('should have all expected template files present', () => {
		for (const [, config] of Object.entries(CONTENT_TYPE_CONFIG)) {
			for (const locale of LOCALES) {
				const filePath = path.join(CSV_TEMPLATES_DIR, `${config.filePrefix}-${locale}.csv`);
				expect(fs.existsSync(filePath)).toBe(true);
			}
		}
	});

	describe.each(Object.entries(CONTENT_TYPE_CONFIG))('%s templates', (contentType, config) => {
		it.each(LOCALES)('should have correct column count for locale %s', (locale) => {
			const filePath = path.join(CSV_TEMPLATES_DIR, `${config.filePrefix}-${locale}.csv`);
			const csvContent = fs.readFileSync(filePath, 'utf-8');
			const headerLine = csvContent.split('\n')[0];
			const columnCount = headerLine.split(';').length;

			expect(columnCount).toBe(config.columns.length);
		});

		it.each(LOCALES)('should have all data rows pass DTO validation for locale %s', (locale) => {
			const filePath = path.join(CSV_TEMPLATES_DIR, `${config.filePrefix}-${locale}.csv`);
			const csvContent = fs.readFileSync(filePath, 'utf-8');

			const records: Record<string, string>[] = parse(csvContent, {
				from_line: 2,
				skip_empty_lines: true,
				delimiter: ';',
				columns: config.columns,
			});

			expect(records.length).toBeGreaterThan(0);

			for (const [index, record] of records.entries()) {
				const result = config.schema.safeParse(record);
				if (!result.success) {
					fail(
						`Row ${index + 2} in ${config.filePrefix}-${locale}.csv failed validation: ${JSON.stringify(result.error.issues, null, 2)}`,
					);
				}
			}
		});

		it.each(LOCALES)(
			'should produce valid QrCodeContent after DTO parsing for locale %s',
			(locale) => {
				const filePath = path.join(CSV_TEMPLATES_DIR, `${config.filePrefix}-${locale}.csv`);
				const csvContent = fs.readFileSync(filePath, 'utf-8');

				const records: Record<string, string>[] = parse(csvContent, {
					from_line: 2,
					skip_empty_lines: true,
					delimiter: ';',
					columns: config.columns,
				});

				for (const [index, record] of records.entries()) {
					const parsed = config.schema.parse(record);
					const contentData = contentType === 'text' ? parsed.text : parsed;

					const contentResult = QrCodeContent.safeParse({
						type: contentType,
						data: contentData,
					});

					if (!contentResult.success) {
						fail(
							`Row ${index + 2} in ${config.filePrefix}-${locale}.csv failed QrCodeContent validation: ${JSON.stringify(contentResult.error.issues, null, 2)}`,
						);
					}
				}
			},
		);
	});
});
