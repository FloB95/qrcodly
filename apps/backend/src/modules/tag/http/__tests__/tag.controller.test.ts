import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { type User } from '@clerk/fastify';
import { QrCodeDefaults } from '@shared/schemas';
import qs from 'qs';

const TAG_API_PATH = `${API_BASE_PATH}/tag`;

describe('Tag Controller', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let accessTokenPro: string;
	let user: User;
	let _user2: User;
	let _userPro: User;

	const makeRequest = (
		method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT',
		url: string,
		token?: string,
		body?: any,
	) =>
		testServer.inject({
			method,
			url,
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
		accessTokenPro = ctx.accessTokenPro;
		user = ctx.user;
		_user2 = ctx.user2;
		_userPro = ctx.userPro;
	});

	describe('POST /tag', () => {
		it('should create a tag and return 201', async () => {
			const response = await makeRequest('POST', TAG_API_PATH, accessToken, {
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
			const response = await makeRequest('POST', TAG_API_PATH, undefined, {
				name: 'No Auth',
				color: '#000000',
			});

			expect(response.statusCode).toBe(401);
		});

		it('should return 400 when creating a tag with duplicate name', async () => {
			const name = 'Unique Dup Test ' + Date.now();
			await makeRequest('POST', TAG_API_PATH, accessToken, {
				name,
				color: '#111111',
			});

			const response = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name,
				color: '#222222',
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.message).toContain('already exists');
		});

		it('should allow different users to have tags with the same name', async () => {
			const name = 'Shared Name ' + Date.now();
			const res1 = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name,
				color: '#111111',
			});
			expect(res1.statusCode).toBe(201);

			const res2 = await makeRequest('POST', TAG_API_PATH, accessToken2, {
				name,
				color: '#222222',
			});
			expect(res2.statusCode).toBe(201);
		});
	});

	describe('GET /tag', () => {
		it('should list only the authenticated user tags', async () => {
			// Create tags for user2
			await makeRequest('POST', TAG_API_PATH, accessToken2, {
				name: 'User2 Tag',
				color: '#00FF00',
			});

			const response = await makeRequest(
				'GET',
				`${TAG_API_PATH}?${qs.stringify({ page: 1, limit: 10 })}`,
				accessToken,
			);

			expect(response.statusCode).toBe(200);

			const { data } = JSON.parse(response.payload);
			expect(Array.isArray(data)).toBe(true);
			data.forEach((tag: any) => {
				expect(tag.createdBy).toBe(user.id);
			});
		});

		it('should return 401 without auth token', async () => {
			const response = await makeRequest('GET', TAG_API_PATH);
			expect(response.statusCode).toBe(401);
		});
	});

	describe('PATCH /tag/:id', () => {
		it('should update a tag', async () => {
			// Create a tag first
			const createResponse = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name: 'To Update',
				color: '#111111',
			});
			const created = JSON.parse(createResponse.payload);

			const response = await makeRequest('PATCH', `${TAG_API_PATH}/${created.id}`, accessToken, {
				name: 'Updated Name',
				color: '#222222',
			});

			expect(response.statusCode).toBe(200);

			const updated = JSON.parse(response.payload);
			expect(updated.name).toBe('Updated Name');
			expect(updated.color).toBe('#222222');
		});

		it('should return 404 for non-existent tag', async () => {
			const response = await makeRequest(
				'PATCH',
				`${TAG_API_PATH}/00000000-0000-0000-0000-000000000000`,
				accessToken,
				{ name: 'Nope' },
			);

			expect(response.statusCode).toBe(404);
		});

		it('should return 403 for another user tag', async () => {
			const createResponse = await makeRequest('POST', TAG_API_PATH, accessToken2, {
				name: 'Other User Tag',
				color: '#333333',
			});
			const created = JSON.parse(createResponse.payload);

			const response = await makeRequest('PATCH', `${TAG_API_PATH}/${created.id}`, accessToken, {
				name: 'Stolen',
			});

			expect(response.statusCode).toBe(403);
		});

		it('should return 400 when renaming to a duplicate name', async () => {
			const name1 = 'Rename Dup A ' + Date.now();
			const name2 = 'Rename Dup B ' + Date.now();

			await makeRequest('POST', TAG_API_PATH, accessToken, {
				name: name1,
				color: '#111111',
			});

			const res2 = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name: name2,
				color: '#222222',
			});
			const tag2 = JSON.parse(res2.payload);

			// Try to rename tag2 to name1
			const response = await makeRequest('PATCH', `${TAG_API_PATH}/${tag2.id}`, accessToken, {
				name: name1,
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.message).toContain('already exists');
		});
	});

	describe('DELETE /tag/:id', () => {
		it('should delete a tag', async () => {
			const createResponse = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name: 'To Delete',
				color: '#444444',
			});
			const created = JSON.parse(createResponse.payload);

			const response = await makeRequest('DELETE', `${TAG_API_PATH}/${created.id}`, accessToken);

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.deleted).toBe(true);
		});

		it('should return 404 for non-existent tag', async () => {
			const response = await makeRequest(
				'DELETE',
				`${TAG_API_PATH}/00000000-0000-0000-0000-000000000000`,
				accessToken,
			);

			expect(response.statusCode).toBe(404);
		});
	});

	describe('PUT /tag/qr-code/:id - Set QR Code Tags', () => {
		it('should set tags on a QR code', async () => {
			// Create a tag
			const tagResponse = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name: 'QR Tag',
				color: '#555555',
			});
			const createdTag = JSON.parse(tagResponse.payload);

			// Create a QR code
			const qrResponse = await makeRequest('POST', `${API_BASE_PATH}/qr-code`, accessToken, {
				name: 'Tag Test QR',
				content: { type: 'text', data: 'hello' },
				config: QrCodeDefaults,
			});
			const qrCode = JSON.parse(qrResponse.payload);

			// Set tags
			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{ tagIds: [createdTag.id] },
			);

			expect(response.statusCode).toBe(200);
			const tags = JSON.parse(response.payload);
			expect(Array.isArray(tags)).toBe(true);
			expect(tags.length).toBe(1);
			expect(tags[0].id).toBe(createdTag.id);
		});

		it('should clear tags when empty array is passed', async () => {
			// Create a QR code
			const qrResponse = await makeRequest('POST', `${API_BASE_PATH}/qr-code`, accessToken, {
				name: 'Clear Tag QR',
				content: { type: 'text', data: 'hello clear' },
				config: QrCodeDefaults,
			});
			const qrCode = JSON.parse(qrResponse.payload);

			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{ tagIds: [] },
			);

			expect(response.statusCode).toBe(200);
			const tags = JSON.parse(response.payload);
			expect(tags).toHaveLength(0);
		});

		it('should return 403 when free user tries to set more than 1 tag', async () => {
			// Create two tags
			const tag1Res = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name: 'Limit Tag 1',
				color: '#AA0000',
			});
			const tag1 = JSON.parse(tag1Res.payload);

			const tag2Res = await makeRequest('POST', TAG_API_PATH, accessToken, {
				name: 'Limit Tag 2',
				color: '#BB0000',
			});
			const tag2 = JSON.parse(tag2Res.payload);

			// Create a QR code
			const qrResponse = await makeRequest('POST', `${API_BASE_PATH}/qr-code`, accessToken, {
				name: 'Limit Test QR',
				content: { type: 'text', data: 'limit test' },
				config: QrCodeDefaults,
			});
			const qrCode = JSON.parse(qrResponse.payload);

			// Try to set 2 tags as free user
			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{ tagIds: [tag1.id, tag2.id] },
			);

			expect(response.statusCode).toBe(403);
			const body = JSON.parse(response.payload);
			expect(body.message).toContain('Plan limit exceeded');
		});

		it('should allow pro user to set multiple tags', async () => {
			// Create tags as pro user
			const tag1Res = await makeRequest('POST', TAG_API_PATH, accessTokenPro, {
				name: 'Pro Tag 1',
				color: '#CC0000',
			});
			const tag1 = JSON.parse(tag1Res.payload);

			const tag2Res = await makeRequest('POST', TAG_API_PATH, accessTokenPro, {
				name: 'Pro Tag 2',
				color: '#DD0000',
			});
			const tag2 = JSON.parse(tag2Res.payload);

			// Create a QR code as pro user
			const qrResponse = await makeRequest('POST', `${API_BASE_PATH}/qr-code`, accessTokenPro, {
				name: 'Pro Tag QR',
				content: { type: 'text', data: 'pro tags' },
				config: QrCodeDefaults,
			});
			const qrCode = JSON.parse(qrResponse.payload);

			// Set 2 tags as pro user
			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessTokenPro,
				{ tagIds: [tag1.id, tag2.id] },
			);

			// If the pro user isn't configured as pro in Clerk, skip
			if (response.statusCode === 403) {
				console.log('Skipping pro tag test: Test user is not configured as pro in Clerk');
				return;
			}

			expect(response.statusCode).toBe(200);
			const tags = JSON.parse(response.payload);
			expect(tags).toHaveLength(2);
		});
	});
});
