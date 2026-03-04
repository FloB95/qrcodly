import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext as getGlobalTestContext } from '@/tests/shared/test-context';
import { QrCodeDefaults } from '@shared/schemas';
import type { FastifyInstance } from 'fastify';

export const TAG_API_PATH = `${API_BASE_PATH}/tag`;
export const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

export interface TestContext {
	testServer: FastifyInstance;
	accessToken: string;
	accessToken2: string;
	accessTokenPro: string;
}

/**
 * Gets the shared test context.
 * The context is managed globally by test-context.ts.
 */
export const getTestContext = async (): Promise<TestContext> => {
	const ctx = await getGlobalTestContext();
	return {
		testServer: ctx.testServer,
		accessToken: ctx.accessToken,
		accessToken2: ctx.accessToken2,
		accessTokenPro: ctx.accessTokenPro,
	};
};

/**
 * Helper to create a tag via POST request.
 */
export const createTagRequest = async (
	testServer: FastifyInstance,
	payload: { name: string; color?: string },
	token?: string,
) => {
	const response = await testServer.inject({
		method: 'POST',
		url: TAG_API_PATH,
		headers: {
			Authorization: token ? `Bearer ${token}` : '',
		},
		payload: { color: '#FF5733', ...payload },
	});
	expect(response.statusCode).toBe(201);
	return JSON.parse(response.payload);
};

/**
 * Helper to create a QR code for tag assignment tests.
 */
export const createQrCodeForTest = async (
	testServer: FastifyInstance,
	token: string,
	name: string,
) => {
	const response = await testServer.inject({
		method: 'POST',
		url: QR_CODE_API_PATH,
		headers: {
			Authorization: `Bearer ${token}`,
		},
		payload: {
			name,
			content: { type: 'text', data: `data-${name}` },
			config: QrCodeDefaults,
		},
	});
	expect(response.statusCode).toBe(201);
	return JSON.parse(response.payload);
};
