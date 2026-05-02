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
	isDynamic: booleanPreprocess,
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
		columns: ['url', 'name', 'isDynamic'],
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
			'title',
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
			'streetPrivate',
			'cityPrivate',
			'zipPrivate',
			'statePrivate',
			'countryPrivate',
			'streetBusiness',
			'cityBusiness',
			'zipBusiness',
			'stateBusiness',
			'countryBusiness',
			'website',
			'note',
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

function parseCsv(text: string, delimiter: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let current = '';
	let inQuotes = false;

	const pushRow = () => {
		row.push(current);
		current = '';
		if (!(row.length === 1 && row[0] === '')) {
			rows.push(row);
		}
		row = [];
	};

	for (let i = 0; i < text.length; i++) {
		const char = text[i];

		if (inQuotes) {
			if (char === '"' && text[i + 1] === '"') {
				current += '"';
				i++;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				current += char;
			}
			continue;
		}

		if (char === '"') {
			inQuotes = true;
		} else if (char === delimiter) {
			row.push(current);
			current = '';
		} else if (char === '\n') {
			pushRow();
		} else if (char === '\r') {
			pushRow();
			if (text[i + 1] === '\n') i++;
		} else {
			current += char;
		}
	}

	if (current !== '' || row.length > 0) {
		pushRow();
	}

	return rows;
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
	const rows = parseCsv(text, ';');

	if (rows.length === 0) {
		return {
			errors: [{ line: 1, rawValues: [], fieldErrors: [{ column: '', message: 'File is empty' }] }],
			columns,
		};
	}

	if (rows.length === 1) {
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

	for (let i = 1; i < rows.length; i++) {
		const rawValues = rows[i]!;
		const lineNumber = i + 1;

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
