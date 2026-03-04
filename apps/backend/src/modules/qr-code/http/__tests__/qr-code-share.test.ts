import type { FastifyInstance } from 'fastify';
import type {
	TQrCodeWithRelationsResponseDto,
	TQrCodeShareResponseDto,
	TPublicSharedQrCodeResponseDto,
	TCreateQrCodeShareDto,
	TUpdateQrCodeShareDto,
} from '@shared/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import { generateQrCodeDto, getTestContext, createQrCodeRequest } from './utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;
const PUBLIC_SHARE_API_PATH = `${API_BASE_PATH}/s`;

describe('QR Code Share', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	// Helper to create a QR code
	const createQrCode = async (token: string): Promise<TQrCodeWithRelationsResponseDto> => {
		const dto = generateQrCodeDto();
		const response = await createQrCodeRequest(testServer, dto, token);
		expect(response.statusCode).toBe(201);
		return JSON.parse(response.payload);
	};

	// Helper to create share link
	const createShareRequest = async (
		qrCodeId: string,
		payload?: TCreateQrCodeShareDto,
		token?: string,
	) =>
		testServer.inject({
			method: 'POST',
			url: `${QR_CODE_API_PATH}/${qrCodeId}/share`,
			payload,
			headers: {
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
			},
		});

	// Helper to get share link
	const getShareRequest = async (qrCodeId: string, token?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${QR_CODE_API_PATH}/${qrCodeId}/share`,
			headers: {
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
			},
		});

	// Helper to update share link
	const updateShareRequest = async (
		qrCodeId: string,
		payload: TUpdateQrCodeShareDto,
		token?: string,
	) =>
		testServer.inject({
			method: 'PATCH',
			url: `${QR_CODE_API_PATH}/${qrCodeId}/share`,
			payload,
			headers: {
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
			},
		});

	// Helper to delete share link
	const deleteShareRequest = async (qrCodeId: string, token?: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${QR_CODE_API_PATH}/${qrCodeId}/share`,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	// Helper to get public share
	const getPublicShareRequest = async (shareToken: string) =>
		testServer.inject({
			method: 'GET',
			url: `${PUBLIC_SHARE_API_PATH}/${shareToken}`,
			headers: {
				'Content-Type': 'application/json',
			},
		});

	describe('POST /qr-code/:id/share - Create Share Link', () => {
		it('should create a share link with default config', async () => {
			const qrCode = await createQrCode(accessToken);

			const response = await createShareRequest(qrCode.id, {}, accessToken);
			expect(response.statusCode).toBe(201);

			const share = JSON.parse(response.payload) as TQrCodeShareResponseDto;
			expect(share.id).toBeDefined();
			expect(share.qrCodeId).toBe(qrCode.id);
			expect(share.shareToken).toBeDefined();
			expect(share.isActive).toBe(true);
			expect(share.config.showName).toBe(true);
			expect(share.config.showDownloadButton).toBe(true);
		});

		it('should create a share link with custom config', async () => {
			const qrCode = await createQrCode(accessToken);

			const customConfig: TCreateQrCodeShareDto = {
				showName: false,
				showDownloadButton: false,
			};

			const response = await createShareRequest(qrCode.id, customConfig, accessToken);
			expect(response.statusCode).toBe(201);

			const share = JSON.parse(response.payload) as TQrCodeShareResponseDto;
			expect(share.config.showName).toBe(false);
			expect(share.config.showDownloadButton).toBe(false);
		});

		it('should return 401 without authentication', async () => {
			const qrCode = await createQrCode(accessToken);

			const response = await createShareRequest(qrCode.id, {});
			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when trying to share another user's QR code", async () => {
			const qrCode = await createQrCode(accessToken);

			const response = await createShareRequest(qrCode.id, {}, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 for non-existent QR code', async () => {
			const response = await createShareRequest(
				'00000000-0000-0000-0000-000000000000',
				{},
				accessToken,
			);
			expect(response.statusCode).toBe(404);
		});

		it('should return 400 when share already exists', async () => {
			const qrCode = await createQrCode(accessToken);

			// Create first share
			const firstResponse = await createShareRequest(qrCode.id, {}, accessToken);
			expect(firstResponse.statusCode).toBe(201);

			// Try to create second share
			const secondResponse = await createShareRequest(qrCode.id, {}, accessToken);
			expect(secondResponse.statusCode).toBe(400);
		});
	});

	describe('GET /qr-code/:id/share - Get Share Link', () => {
		it('should get an existing share link', async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await getShareRequest(qrCode.id, accessToken);
			expect(response.statusCode).toBe(200);

			const share = JSON.parse(response.payload) as TQrCodeShareResponseDto;
			expect(share.qrCodeId).toBe(qrCode.id);
			expect(share.shareToken).toBeDefined();
		});

		it('should return 401 without authentication', async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await getShareRequest(qrCode.id);
			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when accessing another user's share", async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await getShareRequest(qrCode.id, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 for non-existent QR code', async () => {
			const response = await getShareRequest('00000000-0000-0000-0000-000000000000', accessToken);
			expect(response.statusCode).toBe(404);
		});

		it('should return 404 when share does not exist', async () => {
			const qrCode = await createQrCode(accessToken);

			const response = await getShareRequest(qrCode.id, accessToken);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('PATCH /qr-code/:id/share - Update Share Link', () => {
		it('should update share link config', async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, { showName: true }, accessToken);

			const updatePayload: TUpdateQrCodeShareDto = {
				showName: false,
				showDownloadButton: false,
			};

			const response = await updateShareRequest(qrCode.id, updatePayload, accessToken);
			expect(response.statusCode).toBe(200);

			const share = JSON.parse(response.payload) as TQrCodeShareResponseDto;
			expect(share.config.showName).toBe(false);
			expect(share.config.showDownloadButton).toBe(false);
		});

		it('should partially update share link config', async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(
				qrCode.id,
				{ showName: true, showDownloadButton: true },
				accessToken,
			);

			const updatePayload: TUpdateQrCodeShareDto = {
				showName: false,
			};

			const response = await updateShareRequest(qrCode.id, updatePayload, accessToken);
			expect(response.statusCode).toBe(200);

			const share = JSON.parse(response.payload) as TQrCodeShareResponseDto;
			expect(share.config.showName).toBe(false);
			expect(share.config.showDownloadButton).toBe(true); // Should remain unchanged
		});

		it('should return 401 without authentication', async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await updateShareRequest(qrCode.id, { showName: false });
			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when updating another user's share", async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await updateShareRequest(qrCode.id, { showName: false }, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 for non-existent QR code', async () => {
			const response = await updateShareRequest(
				'00000000-0000-0000-0000-000000000000',
				{ showName: false },
				accessToken,
			);
			expect(response.statusCode).toBe(404);
		});

		it('should return 404 when share does not exist', async () => {
			const qrCode = await createQrCode(accessToken);

			const response = await updateShareRequest(qrCode.id, { showName: false }, accessToken);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('DELETE /qr-code/:id/share - Delete Share Link', () => {
		it('should delete an existing share link', async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await deleteShareRequest(qrCode.id, accessToken);
			expect(response.statusCode).toBe(200);

			const result = JSON.parse(response.payload);
			expect(result.deleted).toBe(true);

			// Verify share is deleted
			const getResponse = await getShareRequest(qrCode.id, accessToken);
			expect(getResponse.statusCode).toBe(404);
		});

		it('should return 401 without authentication', async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await deleteShareRequest(qrCode.id);
			expect(response.statusCode).toBe(401);
		});

		it("should return 403 when deleting another user's share", async () => {
			const qrCode = await createQrCode(accessToken);
			await createShareRequest(qrCode.id, {}, accessToken);

			const response = await deleteShareRequest(qrCode.id, accessToken2);
			expect(response.statusCode).toBe(403);
		});

		it('should return 404 for non-existent QR code', async () => {
			const response = await deleteShareRequest(
				'00000000-0000-0000-0000-000000000000',
				accessToken,
			);
			expect(response.statusCode).toBe(404);
		});

		it('should return 404 when share does not exist', async () => {
			const qrCode = await createQrCode(accessToken);

			const response = await deleteShareRequest(qrCode.id, accessToken);
			expect(response.statusCode).toBe(404);
		});
	});

	describe('GET /s/:shareToken - Public Share Access', () => {
		it('should return shared QR code data with all options enabled', async () => {
			const qrCode = await createQrCode(accessToken);
			const createResponse = await createShareRequest(
				qrCode.id,
				{ showName: true, showDownloadButton: true },
				accessToken,
			);
			const share = JSON.parse(createResponse.payload) as TQrCodeShareResponseDto;

			const response = await getPublicShareRequest(share.shareToken);
			expect(response.statusCode).toBe(200);

			const publicShare = JSON.parse(response.payload) as TPublicSharedQrCodeResponseDto;
			expect(publicShare.name).toBe(qrCode.name);
			expect(publicShare.content).toBeDefined();
			expect(publicShare.config).toBeDefined();
			expect(publicShare.shareConfig.showName).toBe(true);
			expect(publicShare.shareConfig.showDownloadButton).toBe(true);
			expect(publicShare.qrCodeData).toBeDefined();
		});

		it('should hide name when showName is false', async () => {
			const qrCode = await createQrCode(accessToken);
			const createResponse = await createShareRequest(
				qrCode.id,
				{ showName: false, showDownloadButton: true },
				accessToken,
			);
			const share = JSON.parse(createResponse.payload) as TQrCodeShareResponseDto;

			const response = await getPublicShareRequest(share.shareToken);
			expect(response.statusCode).toBe(200);

			const publicShare = JSON.parse(response.payload) as TPublicSharedQrCodeResponseDto;
			expect(publicShare.name).toBeNull();
			expect(publicShare.shareConfig.showName).toBe(false);
		});

		it('should respect showDownloadButton config', async () => {
			const qrCode = await createQrCode(accessToken);
			const createResponse = await createShareRequest(
				qrCode.id,
				{ showName: true, showDownloadButton: false },
				accessToken,
			);
			const share = JSON.parse(createResponse.payload) as TQrCodeShareResponseDto;

			const response = await getPublicShareRequest(share.shareToken);
			expect(response.statusCode).toBe(200);

			const publicShare = JSON.parse(response.payload) as TPublicSharedQrCodeResponseDto;
			expect(publicShare.shareConfig.showDownloadButton).toBe(false);
		});

		it('should return 404 for non-existent share token', async () => {
			const response = await getPublicShareRequest('00000000-0000-0000-0000-000000000000');
			expect(response.statusCode).toBe(404);
		});

		it('should return 404 after share is deleted', async () => {
			const qrCode = await createQrCode(accessToken);
			const createResponse = await createShareRequest(qrCode.id, {}, accessToken);
			const share = JSON.parse(createResponse.payload) as TQrCodeShareResponseDto;

			// Verify share works
			const publicResponse = await getPublicShareRequest(share.shareToken);
			expect(publicResponse.statusCode).toBe(200);

			// Delete share
			await deleteShareRequest(qrCode.id, accessToken);

			// Verify share no longer works
			const deletedResponse = await getPublicShareRequest(share.shareToken);
			expect(deletedResponse.statusCode).toBe(404);
		});

		it('should not require authentication', async () => {
			const qrCode = await createQrCode(accessToken);
			const createResponse = await createShareRequest(qrCode.id, {}, accessToken);
			const share = JSON.parse(createResponse.payload) as TQrCodeShareResponseDto;

			// Access without any auth headers
			const response = await testServer.inject({
				method: 'GET',
				url: `${PUBLIC_SHARE_API_PATH}/${share.shareToken}`,
			});
			expect(response.statusCode).toBe(200);
		});
	});

	describe('Share Link Lifecycle', () => {
		it('should handle full lifecycle: create, get, update, delete', async () => {
			// Create QR code
			const qrCode = await createQrCode(accessToken);

			// Create share
			const createResponse = await createShareRequest(
				qrCode.id,
				{ showName: true, showDownloadButton: true },
				accessToken,
			);
			expect(createResponse.statusCode).toBe(201);
			const share = JSON.parse(createResponse.payload) as TQrCodeShareResponseDto;

			// Get share
			const getResponse = await getShareRequest(qrCode.id, accessToken);
			expect(getResponse.statusCode).toBe(200);
			const retrievedShare = JSON.parse(getResponse.payload) as TQrCodeShareResponseDto;
			expect(retrievedShare.shareToken).toBe(share.shareToken);

			// Access public share
			const publicResponse = await getPublicShareRequest(share.shareToken);
			expect(publicResponse.statusCode).toBe(200);

			// Update share
			const updateResponse = await updateShareRequest(qrCode.id, { showName: false }, accessToken);
			expect(updateResponse.statusCode).toBe(200);
			const updatedShare = JSON.parse(updateResponse.payload) as TQrCodeShareResponseDto;
			expect(updatedShare.config.showName).toBe(false);

			// Verify update reflected in public share
			const updatedPublicResponse = await getPublicShareRequest(share.shareToken);
			expect(updatedPublicResponse.statusCode).toBe(200);
			const updatedPublicShare = JSON.parse(
				updatedPublicResponse.payload,
			) as TPublicSharedQrCodeResponseDto;
			expect(updatedPublicShare.name).toBeNull();

			// Delete share
			const deleteResponse = await deleteShareRequest(qrCode.id, accessToken);
			expect(deleteResponse.statusCode).toBe(200);

			// Verify share is gone
			const finalGetResponse = await getShareRequest(qrCode.id, accessToken);
			expect(finalGetResponse.statusCode).toBe(404);

			// Verify public access is gone
			const finalPublicResponse = await getPublicShareRequest(share.shareToken);
			expect(finalPublicResponse.statusCode).toBe(404);
		});

		it('should allow creating new share after deletion', async () => {
			const qrCode = await createQrCode(accessToken);

			// Create first share
			const firstCreate = await createShareRequest(qrCode.id, {}, accessToken);
			expect(firstCreate.statusCode).toBe(201);
			const firstShare = JSON.parse(firstCreate.payload) as TQrCodeShareResponseDto;

			// Delete share
			await deleteShareRequest(qrCode.id, accessToken);

			// Create new share
			const secondCreate = await createShareRequest(qrCode.id, {}, accessToken);
			expect(secondCreate.statusCode).toBe(201);
			const secondShare = JSON.parse(secondCreate.payload) as TQrCodeShareResponseDto;

			// Tokens should be different
			expect(secondShare.shareToken).not.toBe(firstShare.shareToken);
		});
	});
});
