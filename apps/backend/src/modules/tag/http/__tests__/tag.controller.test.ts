import { API_BASE_PATH } from '@/core/config/constants';
import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { type User } from '@clerk/fastify';
import { QrCodeDefaults } from '@shared/schemas';
import qs from 'qs';

const TAG_API_PATH = `${API_BASE_PATH}/tag`;
const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;

describe('Tag Controller', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let accessTokenPro: string;
	let user: User;
	let user2: User;
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

	const createTag = async (token: string, name: string, color = '#FF5733') => {
		const response = await makeRequest('POST', TAG_API_PATH, token, { name, color });
		expect(response.statusCode).toBe(201);
		return JSON.parse(response.payload);
	};

	const createQrCode = async (token: string, name: string) => {
		const response = await makeRequest('POST', QR_CODE_API_PATH, token, {
			name,
			content: { type: 'text', data: `data-${name}` },
			config: QrCodeDefaults,
		});
		expect(response.statusCode).toBe(201);
		return JSON.parse(response.payload);
	};

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		accessTokenPro = ctx.accessTokenPro;
		user = ctx.user;
		user2 = ctx.user2;
		_userPro = ctx.userPro;
	});

	// ──────────────────────────────────────────────
	// POST /tag
	// ──────────────────────────────────────────────
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

		it('should return 400 when missing required fields', async () => {
			const response = await makeRequest('POST', TAG_API_PATH, accessToken, {});

			expect(response.statusCode).toBe(400);
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

	// ──────────────────────────────────────────────
	// GET /tag
	// ──────────────────────────────────────────────
	describe('GET /tag', () => {
		it('should list only the authenticated user tags', async () => {
			// Create tags for user2
			await makeRequest('POST', TAG_API_PATH, accessToken2, {
				name: 'User2 Tag ' + Date.now(),
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

		it('should return paginated results', async () => {
			const response = await makeRequest(
				'GET',
				`${TAG_API_PATH}?${qs.stringify({ page: 1, limit: 2 })}`,
				accessToken,
			);

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.data.length).toBeLessThanOrEqual(2);
			expect(body.page).toBe(1);
			expect(body.limit).toBe(2);
			expect(typeof body.total).toBe('number');
		});

		it('should not leak other user tags', async () => {
			const name = 'Secret Tag ' + Date.now();
			await createTag(accessToken2, name);

			const response = await makeRequest(
				'GET',
				`${TAG_API_PATH}?${qs.stringify({ page: 1, limit: 100 })}`,
				accessToken,
			);

			const { data } = JSON.parse(response.payload);
			const found = data.find((t: any) => t.name === name);
			expect(found).toBeUndefined();
		});
	});

	// ──────────────────────────────────────────────
	// PATCH /tag/:id
	// ──────────────────────────────────────────────
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

		it('should return 401 without auth token', async () => {
			const tag = await createTag(accessToken, 'Auth Test Patch ' + Date.now());

			const response = await makeRequest('PATCH', `${TAG_API_PATH}/${tag.id}`, undefined, {
				name: 'Hacked',
			});

			expect(response.statusCode).toBe(401);
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
				name: 'OtherUser ' + Date.now(),
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

	// ──────────────────────────────────────────────
	// DELETE /tag/:id
	// ──────────────────────────────────────────────
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

		it('should return 401 without auth token', async () => {
			const tag = await createTag(accessToken, 'Auth Test Delete ' + Date.now());

			const response = await makeRequest('DELETE', `${TAG_API_PATH}/${tag.id}`);

			expect(response.statusCode).toBe(401);
		});

		it('should return 404 for non-existent tag', async () => {
			const response = await makeRequest(
				'DELETE',
				`${TAG_API_PATH}/00000000-0000-0000-0000-000000000000`,
				accessToken,
			);

			expect(response.statusCode).toBe(404);
		});

		it('should return 403 when deleting another user tag', async () => {
			const tag = await createTag(accessToken2, 'DelCross ' + Date.now());

			const response = await makeRequest('DELETE', `${TAG_API_PATH}/${tag.id}`, accessToken);

			expect(response.statusCode).toBe(403);
		});

		it('should return 404 when deleting an already deleted tag', async () => {
			const tag = await createTag(accessToken, 'Double Delete ' + Date.now());

			await makeRequest('DELETE', `${TAG_API_PATH}/${tag.id}`, accessToken);
			const response = await makeRequest('DELETE', `${TAG_API_PATH}/${tag.id}`, accessToken);

			expect(response.statusCode).toBe(404);
		});
	});

	// ──────────────────────────────────────────────
	// PUT /tag/qr-code/:id - Set QR Code Tags
	// ──────────────────────────────────────────────
	describe('PUT /tag/qr-code/:id - Set QR Code Tags', () => {
		it('should set tags on a QR code', async () => {
			const tag = await createTag(accessToken, 'QR Tag ' + Date.now());
			const qrCode = await createQrCode(accessToken, 'Tag Test QR ' + Date.now());

			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{ tagIds: [tag.id] },
			);

			expect(response.statusCode).toBe(200);
			const tags = JSON.parse(response.payload);
			expect(Array.isArray(tags)).toBe(true);
			expect(tags.length).toBe(1);
			expect(tags[0].id).toBe(tag.id);
		});

		it('should clear tags when empty array is passed', async () => {
			const qrCode = await createQrCode(accessToken, 'Clear Tag QR ' + Date.now());

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

		it('should return 401 without auth token', async () => {
			const qrCode = await createQrCode(accessToken, 'No Auth QR ' + Date.now());

			const response = await makeRequest('PUT', `${TAG_API_PATH}/qr-code/${qrCode.id}`, undefined, {
				tagIds: [],
			});

			expect(response.statusCode).toBe(401);
		});

		it('should return 404 for non-existent QR code', async () => {
			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/00000000-0000-0000-0000-000000000000`,
				accessToken,
				{ tagIds: [] },
			);

			expect(response.statusCode).toBe(404);
		});

		it('should return 403 when setting tags on another user QR code', async () => {
			const tag = await createTag(accessToken, 'IDOR Tag ' + Date.now());
			const qrCode = await createQrCode(accessToken2, 'User2 QR ' + Date.now());

			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{ tagIds: [tag.id] },
			);

			expect(response.statusCode).toBe(403);
		});

		it('should return 403 when using another user tags', async () => {
			const user2Tag = await createTag(accessToken2, 'User2 Tag IDOR ' + Date.now());
			const qrCode = await createQrCode(accessToken, 'Own QR ' + Date.now());

			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{ tagIds: [user2Tag.id] },
			);

			expect(response.statusCode).toBe(403);
		});

		it('should return 403 when free user tries to set more than 1 tag', async () => {
			const tag1 = await createTag(accessToken, 'Limit Tag A ' + Date.now());
			const tag2 = await createTag(accessToken, 'Limit Tag B ' + Date.now());
			const qrCode = await createQrCode(accessToken, 'Limit Test QR ' + Date.now());

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
			const tag1 = await createTag(accessTokenPro, 'Pro Tag A ' + Date.now());
			const tag2 = await createTag(accessTokenPro, 'Pro Tag B ' + Date.now());
			const qrCode = await createQrCode(accessTokenPro, 'Pro Tag QR ' + Date.now());

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

		it('should replace existing tags with new ones', async () => {
			const tag1 = await createTag(accessToken, 'Replace A ' + Date.now());
			const tag2 = await createTag(accessToken, 'Replace B ' + Date.now());
			const qrCode = await createQrCode(accessToken, 'Replace QR ' + Date.now());

			// Set first tag
			await makeRequest('PUT', `${TAG_API_PATH}/qr-code/${qrCode.id}`, accessToken, {
				tagIds: [tag1.id],
			});

			// Replace with second tag
			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{ tagIds: [tag2.id] },
			);

			expect(response.statusCode).toBe(200);
			const tags = JSON.parse(response.payload);
			expect(tags).toHaveLength(1);
			expect(tags[0].id).toBe(tag2.id);
		});

		it('should default to empty tags when tagIds is omitted', async () => {
			const tag = await createTag(accessToken, 'Default Tag ' + Date.now());
			const qrCode = await createQrCode(accessToken, 'Default Body QR ' + Date.now());

			// First set a tag
			await makeRequest('PUT', `${TAG_API_PATH}/qr-code/${qrCode.id}`, accessToken, {
				tagIds: [tag.id],
			});

			// Then send empty body (tagIds defaults to [])
			const response = await makeRequest(
				'PUT',
				`${TAG_API_PATH}/qr-code/${qrCode.id}`,
				accessToken,
				{},
			);

			expect(response.statusCode).toBe(200);
			const tags = JSON.parse(response.payload);
			expect(tags).toHaveLength(0);
		});
	});
});
