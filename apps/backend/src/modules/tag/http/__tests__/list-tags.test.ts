import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { type User } from '@clerk/fastify';
import qs from 'qs';
import { TAG_API_PATH, createTagRequest } from './utils';

describe('listTags', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let user: User;

	const listTagsRequest = async (query?: Record<string, any>, token?: string) =>
		testServer.inject({
			method: 'GET',
			url: query ? `${TAG_API_PATH}?${qs.stringify(query)}` : TAG_API_PATH,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		user = ctx.user;
	});

	it('should list only the authenticated user tags', async () => {
		// Create tags for user2
		await createTagRequest(testServer, { name: 'User2 Tag ' + Date.now() }, accessToken2);

		const response = await listTagsRequest({ page: 1, limit: 10 }, accessToken);

		expect(response.statusCode).toBe(200);

		const { data } = JSON.parse(response.payload);
		expect(Array.isArray(data)).toBe(true);
		data.forEach((tag: any) => {
			expect(tag.createdBy).toBe(user.id);
		});
	});

	it('should return 401 without auth token', async () => {
		const response = await listTagsRequest();
		expect(response.statusCode).toBe(401);
	});

	it('should return paginated results', async () => {
		const response = await listTagsRequest({ page: 1, limit: 2 }, accessToken);

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.payload);
		expect(body.data.length).toBeLessThanOrEqual(2);
		expect(body.page).toBe(1);
		expect(body.limit).toBe(2);
		expect(typeof body.total).toBe('number');
	});

	it('should not leak other user tags', async () => {
		const name = 'Secret Tag ' + Date.now();
		await createTagRequest(testServer, { name }, accessToken2);

		const response = await listTagsRequest({ page: 1, limit: 100 }, accessToken);

		const { data } = JSON.parse(response.payload);
		const found = data.find((t: any) => t.name === name);
		expect(found).toBeUndefined();
	});
});
