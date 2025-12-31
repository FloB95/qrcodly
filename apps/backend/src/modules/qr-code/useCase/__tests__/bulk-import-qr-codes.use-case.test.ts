/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import 'reflect-metadata';
import { BulkImportQrCodesUseCase } from '../bulk-import-qr-codes.use-case';
import { type CreateQrCodeUseCase } from '../create-qr-code.use-case';
import { type Logger } from '@/core/logging';
import { mock, type MockProxy } from 'jest-mock-extended';
import { QrCodeDefaults, type TBulkImportQrCodeDto } from '@shared/schemas';
import { type TUser } from '@/core/domain/schema/UserSchema';
import { type TQrCodeWithRelations } from '../../domain/entities/qr-code.entity';
import { BadRequestError } from '@/core/error/http';
import { BulkContentTypeNotSupported } from '../../error/http/bulk-content-type-not-supported.error';
import { BulkToManyQrCodesError } from '../../error/http/bulk-to-many-qr-codes.error';

// Mock sleep function
jest.mock('@/utils/general', () => ({
	sleep: jest.fn().mockResolvedValue(undefined),
}));

describe('Fastify Application Setup', () => {
	it('simple test', () => {
		expect(true).toBe(true);
	});
});

describe('BulkImportQrCodesUseCase', () => {
	let useCase: BulkImportQrCodesUseCase;
	let mockCreateQrCodeUseCase: MockProxy<CreateQrCodeUseCase>;
	let mockLogger: MockProxy<Logger>;

	const mockUser: TUser = {
		id: 'user-123',
		email: 'test@example.com',
		plan: 'free',
	};

	const mockCreatedQrCode: TQrCodeWithRelations = {
		id: 'qr-123',
		name: 'Test QR',
		content: {
			type: 'url',
			data: {
				url: 'https://example.com',
				isEditable: false,
			},
		},
		config: QrCodeDefaults,
		createdBy: 'user-123',
		previewImage: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		mockCreateQrCodeUseCase = mock<CreateQrCodeUseCase>();
		mockLogger = mock<Logger>();

		useCase = new BulkImportQrCodesUseCase(mockCreateQrCodeUseCase, mockLogger);

		// Default mock implementations
		mockCreateQrCodeUseCase.execute.mockResolvedValue(mockCreatedQrCode);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('execute', () => {
		it('should parse CSV with semicolon delimiter', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;Test;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test',
					content: expect.objectContaining({
						type: 'url',
						data: expect.objectContaining({
							url: 'https://example.com',
						}),
					}),
				}),
				mockUser,
			);
		});

		it('should skip first line (header)', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;Test;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			// Should only create 1 QR code, not 2 (header should be skipped)
			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledTimes(1);
		});

		it('should skip empty lines', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example1.com;Test1;0\n\n\nhttps://example2.com;Test2;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			// Should only create 2 QR codes (skip empty lines)
			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledTimes(2);
		});

		it('should map CSV columns based on content type (url)', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;Test;1';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test',
					content: {
						type: 'url',
						data: {
							url: 'https://example.com',
							isEditable: true,
						},
					},
				}),
				mockUser,
			);
		});

		it('should map CSV columns for text content type', async () => {
			const csvContent = 'Text;Name\nHello World;Test';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'text',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test',
					content: {
						type: 'text',
						data: 'Hello World',
					},
				}),
				mockUser,
			);
		});

		it('should map CSV columns for wifi content type', async () => {
			const csvContent =
				'SSID;Password;Encryption (WPA, WEP, nopass);Name\nMyNetwork;password123;WPA;Test WiFi';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'wifi',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test WiFi',
					content: {
						type: 'wifi',
						data: expect.objectContaining({
							ssid: 'MyNetwork',
							password: 'password123',
							encryption: 'WPA',
						}),
					},
				}),
				mockUser,
			);
		});

		it('should throw BadRequestError with line number on validation error', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\ninvalid-url;Test;invalid-boolean';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await expect(useCase.execute(dto, mockUser)).rejects.toThrow(BadRequestError);
			await expect(useCase.execute(dto, mockUser)).rejects.toThrow(/line/);
		});

		it('should throw BulkContentTypeNotSupported for unsupported types', async () => {
			const csvContent = 'Data\nSome data';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'event' as any,
				file,
				config: QrCodeDefaults,
			};

			await expect(useCase.execute(dto, mockUser)).rejects.toThrow(BulkContentTypeNotSupported);
		});

		it('should throw BulkToManyQrCodesError when exceeding MAX_QR_CODE_CSV_UPLOADS', async () => {
			// Create CSV with 101 rows (exceeds limit of 100)
			const rows = Array.from({ length: 101 }, (_, i) => `https://example${i}.com;Test${i};0`).join(
				'\n',
			);
			const csvContent = `URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\n${rows}`;
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await expect(useCase.execute(dto, mockUser)).rejects.toThrow(BulkToManyQrCodesError);
		});

		it('should call CreateQrCodeUseCase for each valid CSV row', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example1.com;Test1;0\nhttps://example2.com;Test2;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledTimes(2);
		});

		it('should apply provided config to all created QR codes', async () => {
			const customConfig = {
				...QrCodeDefaults,
				size: 500,
			};

			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;Test;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: customConfig,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					config: customConfig,
				}),
				mockUser,
			);
		});

		it('should use name field from CSV for QR code name', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;My Custom Name;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'My Custom Name',
				}),
				mockUser,
			);
		});

		it('should add 50ms sleep between creations (rate limiting)', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example1.com;Test1;0\nhttps://example2.com;Test2;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			const { sleep } = await import('@/utils/general');

			await useCase.execute(dto, mockUser);

			// Should sleep between each creation
			expect(sleep).toHaveBeenCalledWith(50);
			expect(sleep).toHaveBeenCalledTimes(2);
		});

		it('should return array of all created QR codes', async () => {
			const qrCode1 = { ...mockCreatedQrCode, id: 'qr-1' };
			const qrCode2 = { ...mockCreatedQrCode, id: 'qr-2' };

			mockCreateQrCodeUseCase.execute.mockResolvedValueOnce(qrCode1).mockResolvedValueOnce(qrCode2);

			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example1.com;Test1;0\nhttps://example2.com;Test2;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			const result = await useCase.execute(dto, mockUser);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('qr-1');
			expect(result[1].id).toBe('qr-2');
		});

		it('should maintain order from CSV', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example1.com;First;0\nhttps://example2.com;Second;0\nhttps://example3.com;Third;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			const calls = (mockCreateQrCodeUseCase.execute as jest.Mock).mock.calls;
			expect(calls[0][0].name).toBe('First');
			expect(calls[1][0].name).toBe('Second');
			expect(calls[2][0].name).toBe('Third');
		});

		it('should read File buffer and convert to UTF-8 string', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example.com;Test;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			// Should successfully parse and create QR code
			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalled();
		});

		it('should log bulk import info with record count', async () => {
			const csvContent =
				'URL;Name;Enable Statistics and Editing (1 = true, 0 = false)\nhttps://example1.com;Test1;0\nhttps://example2.com;Test2;0';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockLogger.info).toHaveBeenCalledWith('bulk.import.records', {
				contentType: 'url',
				items: 2,
				user: 'user-123',
			});
		});

		it('should handle malformed CSV gracefully', async () => {
			const csvContent = 'URL;Name\nno_semicolons_here';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'url',
				file,
				config: QrCodeDefaults,
			};

			await expect(useCase.execute(dto, mockUser)).rejects.toThrow(BadRequestError);
		});

		it('should validate required fields per content type (ssid for wifi)', async () => {
			const csvContent = 'SSID;Password;Encryption (WPA, WEP, nopass);Name\n;password123;WPA;Test';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'wifi',
				file,
				config: QrCodeDefaults,
			};

			await expect(useCase.execute(dto, mockUser)).rejects.toThrow(BadRequestError);
		});

		it('should handle vCard CSV with all fields', async () => {
			const csvContent =
				'Name;FirstName;LastName;Email;Phone;Fax;Company;Job;Street;City;ZIP;State;Country;Website\nJohn Doe;John;Doe;john@example.com;+1234567890;;ACME Inc;Developer;123 Main St;New York;10001;NY;USA;https://example.com';
			const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

			const dto: TBulkImportQrCodeDto = {
				contentType: 'vCard',
				file,
				config: QrCodeDefaults,
			};

			await useCase.execute(dto, mockUser);

			expect(mockCreateQrCodeUseCase.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'John Doe',
					content: {
						type: 'vCard',
						data: expect.objectContaining({
							firstName: 'John',
							lastName: 'Doe',
							email: 'john@example.com',
						}),
					},
				}),
				mockUser,
			);
		});
	});
});
