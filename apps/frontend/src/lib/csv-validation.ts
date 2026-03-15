import { z } from 'zod';
import {
	QrCodeSchema,
	UrlInputSchema,
	TextInputSchema,
	WifiInputSchema,
	VCardInputSchema,
	type TQrCodeContentType,
} from '@shared/schemas';

const booleanPreprocess = z.preprocess((value) => {
	if (value === '1' || value === 1) return true;
	if (value === '0' || value === 0) return false;
	return value;
}, z.boolean().optional());

const BulkUrlCsvSchema = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...UrlInputSchema.pick({ url: true }).shape,
	isEditable: booleanPreprocess,
});

const BulkTextCsvSchema = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	text: TextInputSchema,
});

const BulkWifiCsvSchema = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...WifiInputSchema.shape,
});

const { isDynamic: _isDynamic, ...vCardShapeWithoutDynamic } = VCardInputSchema.shape;
const BulkVCardCsvSchema = z.object({
	...QrCodeSchema.pick({ name: true }).shape,
	...vCardShapeWithoutDynamic,
	isDynamic: booleanPreprocess,
});

const columnMap: Partial<Record<TQrCodeContentType, { columns: string[]; schema: z.ZodObject }>> = {
	url: {
		columns: ['url', 'name', 'isEditable'],
		schema: BulkUrlCsvSchema,
	},
	text: {
		columns: ['text', 'name'],
		schema: BulkTextCsvSchema,
	},
	wifi: {
		columns: ['ssid', 'password', 'encryption', 'name'],
		schema: BulkWifiCsvSchema,
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
		schema: BulkVCardCsvSchema,
	},
};

export type CsvFieldError = {
	column: string;
	message: string;
};

export type CsvRowError = {
	line: number;
	rawValues: string[];
	fieldErrors: CsvFieldError[];
};

export type CsvValidationResult = {
	errors: CsvRowError[];
	columns: string[];
};

function parseCsvLine(line: string, delimiter: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (inQuotes) {
			if (char === '"' && line[i + 1] === '"') {
				current += '"';
				i++;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				current += char;
			}
		} else {
			if (char === '"') {
				inQuotes = true;
			} else if (char === delimiter) {
				fields.push(current);
				current = '';
			} else {
				current += char;
			}
		}
	}
	fields.push(current);
	return fields;
}

export function getColumnsForContentType(contentType: TQrCodeContentType): string[] | null {
	return columnMap[contentType]?.columns ?? null;
}

export async function validateCsvFile(
	file: File,
	contentType: TQrCodeContentType,
): Promise<CsvValidationResult> {
	const mapping = columnMap[contentType];
	if (!mapping) {
		return { errors: [], columns: [] };
	}

	const { columns, schema } = mapping;
	const text = await file.text();
	const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');

	if (lines.length === 0) {
		return {
			errors: [{ line: 1, rawValues: [], fieldErrors: [{ column: '', message: 'File is empty' }] }],
			columns,
		};
	}

	if (lines.length === 1) {
		return {
			errors: [
				{
					line: 2,
					rawValues: [],
					fieldErrors: [{ column: '', message: 'No data rows found' }],
				},
			],
			columns,
		};
	}

	const errors: CsvRowError[] = [];

	// Skip header (line 1), validate data rows starting from line 2
	for (let i = 1; i < lines.length; i++) {
		const rawValues = parseCsvLine(lines[i]!, ';');
		const lineNumber = i + 1; // 1-indexed, header is line 1

		if (rawValues.length !== columns.length) {
			errors.push({
				line: lineNumber,
				rawValues,
				fieldErrors: [
					{
						column: '',
						message: `Expected ${columns.length} columns but got ${rawValues.length}`,
					},
				],
			});
			continue;
		}

		// Build record from column names
		const record: Record<string, string> = {};
		columns.forEach((col, idx) => {
			record[col] = rawValues[idx]!;
		});

		const result = schema.safeParse(record);
		if (!result.success) {
			const fieldErrors: CsvFieldError[] = result.error.issues.map((issue) => ({
				column: issue.path.length > 0 ? String(issue.path[0]) : '',
				message: issue.message,
			}));
			errors.push({ line: lineNumber, rawValues, fieldErrors });
		}
	}

	return { errors, columns };
}
