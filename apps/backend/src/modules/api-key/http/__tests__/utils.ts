import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext as getGlobalTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';

export const API_KEY_API_PATH = `${API_BASE_PATH}/api-key`;
export const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

export interface TestContext {
	testServer: FastifyInstance;
	accessToken: string;
	accessToken2: string;
	accessTokenPro: string;
}

export const getTestContext = async (): Promise<TestContext> => {
	const ctx = await getGlobalTestContext();
	return {
		testServer: ctx.testServer,
		accessToken: ctx.accessToken,
		accessToken2: ctx.accessToken2,
		accessTokenPro: ctx.accessTokenPro,
	};
};

export const createApiKeyRequest = async (
	testServer: FastifyInstance,
	payload: { name: string; description?: string; expiresInDays?: number | null },
	token: string,
) =>
	testServer.inject({
		method: 'POST',
		url: API_KEY_API_PATH,
		headers: { Authorization: `Bearer ${token}` },
		payload,
	});

export const listApiKeysRequest = async (testServer: FastifyInstance, token?: string) =>
	testServer.inject({
		method: 'GET',
		url: API_KEY_API_PATH,
		headers: { Authorization: token ? `Bearer ${token}` : '' },
	});

export const revokeApiKeyRequest = async (
	testServer: FastifyInstance,
	apiKeyId: string,
	token?: string,
) =>
	testServer.inject({
		method: 'DELETE',
		url: `${API_KEY_API_PATH}/${apiKeyId}`,
		headers: { Authorization: token ? `Bearer ${token}` : '' },
	});
