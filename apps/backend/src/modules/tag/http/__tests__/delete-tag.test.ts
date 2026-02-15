import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { TAG_API_PATH, createTagRequest } from './utils';

describe('deleteTag', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	const deleteTagRequest = async (id: string, token?: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${TAG_API_PATH}/${id}`,
			headers: {
				Authorization: token ? `Bearer ${token}` : '',
			},
		});

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	it('should delete a tag', async () => {
		const created = await createTagRequest(
			testServer,
			{ name: 'To Delete', color: '#444444' },
			accessToken,
		);

		const response = await deleteTagRequest(created.id, accessToken);

		expect(response.statusCode).toBe(200);
		const body = JSON.parse(response.payload);
		expect(body.deleted).toBe(true);
	});

	it('should return 401 without auth token', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'Auth Test Delete ' + Date.now() },
			accessToken,
		);

		const response = await deleteTagRequest(tag.id);

		expect(response.statusCode).toBe(401);
	});

	it('should return 404 for non-existent tag', async () => {
		const response = await deleteTagRequest('00000000-0000-0000-0000-000000000000', accessToken);

		expect(response.statusCode).toBe(404);
	});

	it('should return 403 when deleting another user tag', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'DelCross ' + Date.now() },
			accessToken2,
		);

		const response = await deleteTagRequest(tag.id, accessToken);

		expect(response.statusCode).toBe(403);
	});

	it('should return 404 when deleting an already deleted tag', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'Double Delete ' + Date.now() },
			accessToken,
		);

		await deleteTagRequest(tag.id, accessToken);
		const response = await deleteTagRequest(tag.id, accessToken);

		expect(response.statusCode).toBe(404);
	});
});
