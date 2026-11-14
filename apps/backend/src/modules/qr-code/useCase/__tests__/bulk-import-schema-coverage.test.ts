import 'reflect-metadata';
import { mock } from 'jest-mock-extended';
import {
	ALL_QR_CODE_CONTENT_TYPES,
	UrlInputSchema,
	WifiInputSchema,
	VCardInputSchema,
	PhoneInputSchema,
	SmsInputSchema,
	WhatsAppInputSchema,
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

	/** Content types that deliberately have no bulk import, with the reason. */
	const notBulkImportable: Partial<Record<TQrCodeContentType, string>> = {
		email: 'not offered yet',
		location: 'not offered yet',
		event: 'not offered yet',
		epc: 'not offered yet',
		pdf: 'hosted page — every row would need its own file upload',
		product: 'hosted page — every row would need its own file uploads',
	};

	const schemaShapes = {
		url: UrlInputSchema.shape,
		wifi: WifiInputSchema.shape,
		vCard: VCardInputSchema.shape,
		phone: PhoneInputSchema.shape,
		sms: SmsInputSchema.shape,
		whatsapp: WhatsAppInputSchema.shape,
	} as const satisfies Partial<Record<TQrCodeContentType, Record<string, unknown>>>;

	const useCase = new BulkImportQrCodesUseCase(mock<CreateQrCodeUseCase>(), mock<Logger>());
	const columnMap = (
		useCase as unknown as {
			columnMap: Partial<Record<TQrCodeContentType, { columns: string[] }>>;
		}
	).columnMap;

	it.each(Object.keys(schemaShapes) as Array<keyof typeof schemaShapes>)(
		'columnMap.%s contains every Input-Schema field (or whitelists the omission)',
		(contentType) => {
			const shape = schemaShapes[contentType];
			const omitted = intentionallyOmitted[contentType] ?? {};
			const required = Object.keys(shape).filter((key) => !(key in omitted));
			const columns = columnMap[contentType]!.columns;

			const missing = required.filter((key) => !columns.includes(key));
			expect(missing).toEqual([]);
		},
	);

	it('text columnMap is { text, name } — TextInputSchema is a plain string, not an object', () => {
		expect(columnMap.text!.columns).toEqual(['text', 'name']);
	});

	it('every supported content-type columnMap includes the QR-code "name" column', () => {
		(Object.keys(columnMap) as TQrCodeContentType[]).forEach((type) => {
			expect(columnMap[type]!.columns).toContain('name');
		});
	});

	it('every content type is either bulk-importable or listed as deliberately excluded', () => {
		for (const type of ALL_QR_CODE_CONTENT_TYPES) {
			const covered = type in columnMap || type in notBulkImportable;
			expect({ type, covered }).toEqual({ type, covered: true });
		}
	});

	it('hosted page types never get a bulk import', () => {
		expect(columnMap.pdf).toBeUndefined();
		expect(columnMap.product).toBeUndefined();
	});
});
