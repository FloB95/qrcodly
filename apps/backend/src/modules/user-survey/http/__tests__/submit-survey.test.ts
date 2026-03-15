import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { type User } from '@clerk/fastify';
import { USER_SURVEY_API_PATH } from './utils';
import db from '@/core/db';
import { userSurvey } from '@/core/db/schemas';
import { eq } from 'drizzle-orm';

describe('submitSurvey', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let user: User;
	let user2: User;

	const submitSurveyRequest = async (token?: string, body?: any) =>
		testServer.inject({
			method: 'POST',
			url: USER_SURVEY_API_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: token ? `Bearer ${token}` : '',
			},
			...(body ? { payload: body } : {}),
		});

	const cleanupSurvey = async (userId: string) => {
		await db.delete(userSurvey).where(eq(userSurvey.userId, userId)).execute();
	};

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		user = ctx.user;
		user2 = ctx.user2;
	});

	afterEach(async () => {
		await cleanupSurvey(user.id);
		await cleanupSurvey(user2.id);
	});

	it('should submit a thumbs up survey and return 201', async () => {
		const response = await submitSurveyRequest(accessToken, {
			rating: 'up',
		});

		expect(response.statusCode).toBe(201);
		const body = JSON.parse(response.payload);
		expect(body.hasResponded).toBe(true);

		// Verify record in database
		const record = await db.query.userSurvey.findFirst({
			where: eq(userSurvey.userId, user.id),
		});
		expect(record).toBeDefined();
		expect(record!.rating).toBe('up');
		expect(record!.feedback).toBeNull();
	});

	it('should submit a thumbs down survey with feedback and return 201', async () => {
		const response = await submitSurveyRequest(accessToken, {
			rating: 'down',
			feedback: 'Could improve the UI',
		});

		expect(response.statusCode).toBe(201);
		const body = JSON.parse(response.payload);
		expect(body.hasResponded).toBe(true);

		const record = await db.query.userSurvey.findFirst({
			where: eq(userSurvey.userId, user.id),
		});
		expect(record).toBeDefined();
		expect(record!.rating).toBe('down');
		expect(record!.feedback).toBe('Could improve the UI');
	});

	it('should return 400 with null rating', async () => {
		const response = await submitSurveyRequest(accessToken, {
			rating: null,
		});

		expect(response.statusCode).toBe(400);
	});

	it('should be idempotent — second submission is silently ignored', async () => {
		await submitSurveyRequest(accessToken, { rating: 'up' });

		const response = await submitSurveyRequest(accessToken, {
			rating: 'down',
			feedback: 'Changed my mind',
		});

		expect(response.statusCode).toBe(201);

		// Original rating should be preserved
		const record = await db.query.userSurvey.findFirst({
			where: eq(userSurvey.userId, user.id),
		});
		expect(record!.rating).toBe('up');
		expect(record!.feedback).toBeNull();
	});

	it('should isolate surveys between users', async () => {
		await submitSurveyRequest(accessToken, { rating: 'up' });
		await submitSurveyRequest(accessToken2, { rating: 'down', feedback: 'Not great' });

		const record1 = await db.query.userSurvey.findFirst({
			where: eq(userSurvey.userId, user.id),
		});
		const record2 = await db.query.userSurvey.findFirst({
			where: eq(userSurvey.userId, user2.id),
		});

		expect(record1!.rating).toBe('up');
		expect(record2!.rating).toBe('down');
		expect(record2!.feedback).toBe('Not great');
	});

	it('should return 401 without auth token', async () => {
		const response = await submitSurveyRequest(undefined, {
			rating: 'up',
		});

		expect(response.statusCode).toBe(401);
	});

	it('should return 400 with invalid rating value', async () => {
		const response = await submitSurveyRequest(accessToken, {
			rating: 'invalid',
		});

		expect(response.statusCode).toBe(400);
	});

	it('should return 400 with empty body', async () => {
		const response = await submitSurveyRequest(accessToken, {});

		expect(response.statusCode).toBe(400);
	});

	it('should truncate feedback to 1000 characters', async () => {
		const longFeedback = 'a'.repeat(1001);
		const response = await submitSurveyRequest(accessToken, {
			rating: 'down',
			feedback: longFeedback,
		});

		expect(response.statusCode).toBe(400);
	});
});
