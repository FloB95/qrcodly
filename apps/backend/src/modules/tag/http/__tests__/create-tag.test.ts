import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { type User } from '@clerk/fastify';
import { TAG_API_PATH } from './utils';

describe('createTag', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let user: User;

	const createTagRequest = async (token?: string, body?: any) =>
		testServer.inject({
			method: 'POST',
			url: TAG_API_PATH,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
			...(body ? { payload: body } : {}),
		});

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		user = ctx.user;
	});

	it('should create a tag and return 201', async () => {
		const response = await createTagRequest(accessToken, {
			name: 'Test Tag',
			color: '#FF5733',
		});

		expect(response.statusCode).toBe(201);

		const tag = JSON.parse(response.payload);
		expect(tag.name).toBe('Test Tag');
		expect(tag.color).toBe('#FF5733');
		expect(tag.createdBy).toBe(user.id);
		expect(tag.id).toBeDefined();
	});

	it('should return 401 without auth token', async () => {
		const response = await createTagRequest(undefined, {
			name: 'No Auth',
			color: '#000000',
		});

		expect(response.statusCode).toBe(401);
	});

	it('should return 400 when creating a tag with duplicate name', async () => {
		const name = 'Unique Dup Test ' + Date.now();
		await createTagRequest(accessToken, {
			name,
			color: '#111111',
		});

		const response = await createTagRequest(accessToken, {
			name,
			color: '#222222',
		});

		expect(response.statusCode).toBe(400);
		const body = JSON.parse(response.payload);
		expect(body.message).toContain('already exists');
	});

	it('should return 400 when missing required fields', async () => {
		const response = await createTagRequest(accessToken, {});

		expect(response.statusCode).toBe(400);
	});

	it('should allow different users to have tags with the same name', async () => {
		const name = 'Shared Name ' + Date.now();
		const res1 = await createTagRequest(accessToken, {
			name,
			color: '#111111',
		});
		expect(res1.statusCode).toBe(201);

		const res2 = await createTagRequest(accessToken2, {
			name,
			color: '#222222',
		});
		expect(res2.statusCode).toBe(201);
	});
});
