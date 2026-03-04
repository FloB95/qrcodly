import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { TAG_API_PATH, createTagRequest } from './utils';

describe('updateTag', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	const updateTagRequest = async (id: string, token?: string, body?: any) =>
		testServer.inject({
			method: 'PATCH',
			url: `${TAG_API_PATH}/${id}`,
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
	});

	it('should update a tag', async () => {
		const created = await createTagRequest(
			testServer,
			{ name: 'To Update', color: '#111111' },
			accessToken,
		);

		const response = await updateTagRequest(created.id, accessToken, {
			name: 'Updated Name',
			color: '#222222',
		});

		expect(response.statusCode).toBe(200);

		const updated = JSON.parse(response.payload);
		expect(updated.name).toBe('Updated Name');
		expect(updated.color).toBe('#222222');
	});

	it('should return 401 without auth token', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'Auth Test Patch ' + Date.now() },
			accessToken,
		);

		const response = await updateTagRequest(tag.id, undefined, {
			name: 'Hacked',
		});

		expect(response.statusCode).toBe(401);
	});

	it('should return 404 for non-existent tag', async () => {
		const response = await updateTagRequest('00000000-0000-0000-0000-000000000000', accessToken, {
			name: 'Nope',
		});

		expect(response.statusCode).toBe(404);
	});

	it('should return 403 for another user tag', async () => {
		const created = await createTagRequest(
			testServer,
			{ name: 'OtherUser ' + Date.now(), color: '#333333' },
			accessToken2,
		);

		const response = await updateTagRequest(created.id, accessToken, {
			name: 'Stolen',
		});

		expect(response.statusCode).toBe(403);
	});

	it('should return 400 when renaming to a duplicate name', async () => {
		const name1 = 'Rename Dup A ' + Date.now();
		const name2 = 'Rename Dup B ' + Date.now();

		await createTagRequest(testServer, { name: name1, color: '#111111' }, accessToken);
		const tag2 = await createTagRequest(testServer, { name: name2, color: '#222222' }, accessToken);

		// Try to rename tag2 to name1
		const response = await updateTagRequest(tag2.id, accessToken, {
			name: name1,
		});

		expect(response.statusCode).toBe(400);
		const body = JSON.parse(response.payload);
		expect(body.message).toContain('already exists');
	});
});
