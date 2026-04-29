import 'reflect-metadata';
import { mock } from 'jest-mock-extended';
import {
	UrlInputSchema,
	WifiInputSchema,
	VCardInputSchema,
	type TQrCodeContentType,
} from '@shared/schemas';
import { BulkImportQrCodesUseCase } from '../bulk-import-qr-codes.use-case';
import { type CreateQrCodeUseCase } from '../create-qr-code.use-case';
import { type Logger } from '@/core/logging';

describe('BulkImportQrCodesUseCase — Input-Schema coverage', () => {
	const intentionallyOmitted: Partial<Record<TQrCodeContentType, Record<string, string>>> = {
		vCard: {
			email: 'deprecated — only kept for DB backwards-compat with legacy records',
			phone: 'deprecated — only kept for DB backwards-compat with legacy records',
		},
	};

	const schemaShapes = {
		url: UrlInputSchema.shape,
		wifi: WifiInputSchema.shape,
		vCard: VCardInputSchema.shape,
	} as const satisfies Partial<Record<TQrCodeContentType, Record<string, unknown>>>;

	const useCase = new BulkImportQrCodesUseCase(mock<CreateQrCodeUseCase>(), mock<Logger>());
	const columnMap = (
		useCase as unknown as {
			columnMap: Record<TQrCodeContentType, { columns: string[] }>;
		}
	).columnMap;

	it.each(Object.keys(schemaShapes) as Array<keyof typeof schemaShapes>)(
		'columnMap.%s contains every Input-Schema field (or whitelists the omission)',
		(contentType) => {
			const shape = schemaShapes[contentType];
			const omitted = intentionallyOmitted[contentType] ?? {};
			const required = Object.keys(shape).filter((key) => !(key in omitted));
			const columns = columnMap[contentType].columns;

			const missing = required.filter((key) => !columns.includes(key));
			expect(missing).toEqual([]);
		},
	);

	it('text columnMap is { text, name } — TextInputSchema is a plain string, not an object', () => {
		expect(columnMap.text.columns).toEqual(['text', 'name']);
	});

	it('every supported content-type columnMap includes the QR-code "name" column', () => {
		(Object.keys(columnMap) as TQrCodeContentType[]).forEach((type) => {
			expect(columnMap[type].columns).toContain('name');
		});
	});
});
