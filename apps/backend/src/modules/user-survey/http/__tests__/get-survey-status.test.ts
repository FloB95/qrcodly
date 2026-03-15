import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { type User } from '@clerk/fastify';
import { USER_SURVEY_API_PATH } from './utils';
import db from '@/core/db';
import { userSurvey } from '@/core/db/schemas';
import { eq } from 'drizzle-orm';

describe('getSurveyStatus', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let user: User;

	const getStatusRequest = async (token?: string) =>
		testServer.inject({
			method: 'GET',
			url: `${USER_SURVEY_API_PATH}/status`,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	const submitSurveyRequest = async (token: string, body: any) =>
		testServer.inject({
			method: 'POST',
			url: USER_SURVEY_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			payload: body,
		});

	const cleanupSurvey = async (userId: string) => {
		await db.delete(userSurvey).where(eq(userSurvey.userId, userId)).execute();
	};

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		user = ctx.user;
	});

	afterEach(async () => {
		await cleanupSurvey(user.id);
	});

	it('should return hasResponded false when user has not submitted', async () => {
		const response = await getStatusRequest(accessToken);

		expect(response).toHaveStatusCode(200);
		const body = JSON.parse(response.payload);
		expect(body.hasResponded).toBe(false);
	});

	it('should return hasResponded true after user submits survey', async () => {
		await submitSurveyRequest(accessToken, { rating: 'up' });

		const response = await getStatusRequest(accessToken);

		expect(response).toHaveStatusCode(200);
		const body = JSON.parse(response.payload);
		expect(body.hasResponded).toBe(true);
	});

	it('should return hasResponded true after thumbs down submission', async () => {
		await submitSurveyRequest(accessToken, { rating: 'down' });

		const response = await getStatusRequest(accessToken);

		expect(response).toHaveStatusCode(200);
		const body = JSON.parse(response.payload);
		expect(body.hasResponded).toBe(true);
	});

	it('should return 401 without auth token', async () => {
		const response = await getStatusRequest();

		expect(response).toHaveStatusCode(401);
	});
});
