import type { FastifyInstance } from 'fastify';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { resetTestState } from '@/tests/shared/test-context';
import {
	getTestContext,
	createQrCodeRequest,
	generateQrCodeDto,
	generateDynamicUrlQrCodeDto,
	QR_CODE_API_PATH,
} from './utils';

describe('duplicateQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	const duplicateRequest = async (qrCodeId: string, token?: string) =>
		testServer.inject({
			method: 'POST',
			url: `${QR_CODE_API_PATH}/${qrCodeId}/duplicate`,
			headers: {
				...(token && { Authorization: `Bearer ${token}` }),
			},
		});

	const createAndParse = async (dto: TCreateQrCodeDto, token: string) => {
		const response = await createQrCodeRequest(testServer, dto, token);
		expect(response).toHaveStatusCode(201);
		return JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
	};

	it('should duplicate a static QR code and return 201', async () => {
		const dto = generateQrCodeDto();
		const source = await createAndParse(dto, accessToken);

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(duplicate.id).not.toBe(source.id);
		expect(duplicate.content).toEqual(source.content);
		expect(duplicate.config).toEqual(source.config);
		expect(duplicate.name).toBe(`(Copy) ${source.name}`);
		expect(duplicate.previewImage).toBeNull();
	});

	it('should truncate name when original is at max length', async () => {
		const dto = generateQrCodeDto();
		dto.name = 'A'.repeat(50);
		const source = await createAndParse(dto, accessToken);

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(duplicate.name!.length).toBeLessThanOrEqual(50);
		expect(duplicate.name!.startsWith('(Copy) ')).toBe(true);
	});

	it('should duplicate a dynamic QR code with a new short URL', async () => {
		const dto = generateDynamicUrlQrCodeDto();
		const source = await createAndParse(dto, accessToken);
		expect(source.shortUrl).not.toBeNull();

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(duplicate.shortUrl).not.toBeNull();
		expect(duplicate.shortUrl!.shortCode).not.toBe(source.shortUrl!.shortCode);
		expect(duplicate.shortUrl!.id).not.toBe(source.shortUrl!.id);
	});

	it('should return 401 when not authenticated', async () => {
		const response = await duplicateRequest('some-id');
		expect(response).toHaveStatusCode(401);
	});

	it('should return 404 when QR code does not exist', async () => {
		const response = await duplicateRequest('non-existent-id', accessToken);
		expect(response).toHaveStatusCode(404);
	});

	it("should return 403 when duplicating another user's QR code", async () => {
		const dto = generateQrCodeDto();
		const source = await createAndParse(dto, accessToken);

		const response = await duplicateRequest(source.id, accessToken2);
		expect(response).toHaveStatusCode(403);
	});
});
