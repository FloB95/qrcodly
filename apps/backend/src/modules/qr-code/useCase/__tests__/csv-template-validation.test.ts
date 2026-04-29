import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { mock } from 'jest-mock-extended';
import { QrCodeContent, type TQrCodeContentType } from '@shared/schemas';
import type { ZodObject } from 'zod';
import { BulkImportQrCodesUseCase } from '../bulk-import-qr-codes.use-case';
import { type CreateQrCodeUseCase } from '../create-qr-code.use-case';
import { type Logger } from '@/core/logging';

const CSV_TEMPLATES_DIR = path.resolve(
	__dirname,
	'../../../../../../frontend/public/csv-templates',
);

const LOCALES = ['en', 'de', 'es', 'fr', 'it', 'nl', 'pl', 'ru'] as const;

const FILE_PREFIXES: Record<TQrCodeContentType, string> = {
	url: 'qrcodly-import-url',
	text: 'qrcodly-import-text',
	wifi: 'qrcodly-import-wifi',
	vCard: 'qrcodly-import-vcard',
	email: '',
	location: '',
	event: '',
	epc: '',
};

const useCaseInstance = new BulkImportQrCodesUseCase(mock<CreateQrCodeUseCase>(), mock<Logger>());
const useCaseColumnMap = (
	useCaseInstance as unknown as {
		columnMap: Partial<Record<TQrCodeContentType, { columns: string[]; schema: ZodObject }>>;
	}
).columnMap;

const CONTENT_TYPE_CONFIG = Object.fromEntries(
	Object.entries(useCaseColumnMap).map(([contentType, entry]) => [
		contentType,
		{
			columns: entry.columns,
			schema: entry.schema,
			filePrefix: FILE_PREFIXES[contentType as TQrCodeContentType],
		},
	]),
) as Record<string, { columns: string[]; schema: ZodObject; filePrefix: string }>;

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
