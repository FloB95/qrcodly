import type { FastifyInstance } from 'fastify';
import { QrCodeDefaults } from '@shared/schemas';
import type { TCreateQrCodeDto, TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { resetTestState } from '@/tests/shared/test-context';
import {
	getTestContext,
	createQrCodeRequest,
	generateQrCodeDto,
	generateDynamicUrlQrCodeDto,
	QR_CODE_API_PATH,
} from './utils';
import { API_BASE_PATH } from '@/core/config/constants';

const TAG_API_PATH = `${API_BASE_PATH}/tag`;
const TEST_BASE64_IMAGE =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

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

	it('should carry over tags to the duplicated QR code', async () => {
		const tagResponse = await testServer.inject({
			method: 'POST',
			url: TAG_API_PATH,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: { name: `DupTag ${Date.now()}`, color: '#FF5733' },
		});
		expect(tagResponse).toHaveStatusCode(201);
		const tag = JSON.parse(tagResponse.payload) as { id: string; name: string };

		const source = await createAndParse(generateQrCodeDto(), accessToken);

		const assignResponse = await testServer.inject({
			method: 'PUT',
			url: `${TAG_API_PATH}/qr-code/${source.id}`,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: { tagIds: [tag.id] },
		});
		expect(assignResponse).toHaveStatusCode(200);

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		expect(duplicate.tags.map((t) => t.id)).toEqual([tag.id]);
	});

	it('should copy the embedded image to the qr-code upload folder', async () => {
		const dto: TCreateQrCodeDto = {
			...generateQrCodeDto(),
			config: { ...QrCodeDefaults, image: TEST_BASE64_IMAGE },
		};
		const source = await createAndParse(dto, accessToken);
		expect(source.config.image).toBeTruthy();
		expect(source.config.image).not.toContain('base64');

		const response = await duplicateRequest(source.id, accessToken);
		expect(response).toHaveStatusCode(201);

		const duplicate = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
		const duplicatedImage = duplicate.config.image!;
		expect(duplicatedImage).toBeTruthy();
		expect(duplicatedImage).not.toContain('base64');
		expect(duplicatedImage).not.toBe(source.config.image);
		expect(duplicatedImage).toContain('qr-codes/images/uploads/');
		expect(duplicatedImage).not.toContain('config-templates/');
	});

	it('should increment counter when duplicating an already-copied QR code', async () => {
		const source = await createAndParse(generateQrCodeDto(), accessToken);

		const firstResponse = await duplicateRequest(source.id, accessToken);
		expect(firstResponse).toHaveStatusCode(201);
		const firstCopy = JSON.parse(firstResponse.payload) as TQrCodeWithRelationsResponseDto;
		expect(firstCopy.name).toBe(`(Copy) ${source.name}`);

		const secondResponse = await duplicateRequest(firstCopy.id, accessToken);
		expect(secondResponse).toHaveStatusCode(201);
		const secondCopy = JSON.parse(secondResponse.payload) as TQrCodeWithRelationsResponseDto;
		expect(secondCopy.name).toBe(`(Copy 2) ${source.name}`);
	});
});
