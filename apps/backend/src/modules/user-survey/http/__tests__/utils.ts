import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext as getGlobalTestContext } from '@/tests/shared/test-context';
import type { FastifyInstance } from 'fastify';

export const USER_SURVEY_API_PATH = `${API_BASE_PATH}/user-survey`;

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
