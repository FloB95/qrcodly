import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { TAG_API_PATH, createTagRequest, createQrCodeForTest } from './utils';

describe('setQrCodeTags', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let accessTokenPro: string;

	const setQrCodeTagsRequest = async (qrCodeId: string, token?: string, body?: any) =>
		testServer.inject({
			method: 'PUT',
			url: `${TAG_API_PATH}/qr-code/${qrCodeId}`,
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
	});

	it('should set tags on a QR code', async () => {
		const tag = await createTagRequest(testServer, { name: 'QR Tag ' + Date.now() }, accessToken);
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'Tag Test QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [tag.id],
		});

		expect(response.statusCode).toBe(200);
		const tags = JSON.parse(response.payload);
		expect(Array.isArray(tags)).toBe(true);
		expect(tags.length).toBe(1);
		expect(tags[0].id).toBe(tag.id);
	});

	it('should clear tags when empty array is passed', async () => {
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'Clear Tag QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, { tagIds: [] });

		expect(response.statusCode).toBe(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(0);
	});

	it('should return 401 without auth token', async () => {
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'No Auth QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, undefined, { tagIds: [] });

		expect(response.statusCode).toBe(401);
	});

	it('should return 404 for non-existent QR code', async () => {
		const response = await setQrCodeTagsRequest(
			'00000000-0000-0000-0000-000000000000',
			accessToken,
			{ tagIds: [] },
		);

		expect(response.statusCode).toBe(404);
	});

	it('should return 403 when setting tags on another user QR code', async () => {
		const tag = await createTagRequest(testServer, { name: 'IDOR Tag ' + Date.now() }, accessToken);
		const qrCode = await createQrCodeForTest(testServer, accessToken2, 'User2 QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [tag.id],
		});

		expect(response.statusCode).toBe(403);
	});

	it('should return 403 when using another user tags', async () => {
		const user2Tag = await createTagRequest(
			testServer,
			{ name: 'User2 Tag IDOR ' + Date.now() },
			accessToken2,
		);
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'Own QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [user2Tag.id],
		});

		expect(response.statusCode).toBe(403);
	});

	it('should return 403 when free user tries to set more than 1 tag', async () => {
		const tag1 = await createTagRequest(
			testServer,
			{ name: 'Limit Tag A ' + Date.now() },
			accessToken,
		);
		const tag2 = await createTagRequest(
			testServer,
			{ name: 'Limit Tag B ' + Date.now() },
			accessToken,
		);
		const qrCode = await createQrCodeForTest(
			testServer,
			accessToken,
			'Limit Test QR ' + Date.now(),
		);

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [tag1.id, tag2.id],
		});

		expect(response.statusCode).toBe(403);
		const body = JSON.parse(response.payload);
		expect(body.message).toContain('Plan limit exceeded');
	});

	it('should allow pro user to set multiple tags', async () => {
		const tag1 = await createTagRequest(
			testServer,
			{ name: 'Pro Tag A ' + Date.now() },
			accessTokenPro,
		);
		const tag2 = await createTagRequest(
			testServer,
			{ name: 'Pro Tag B ' + Date.now() },
			accessTokenPro,
		);
		const qrCode = await createQrCodeForTest(
			testServer,
			accessTokenPro,
			'Pro Tag QR ' + Date.now(),
		);

		const response = await setQrCodeTagsRequest(qrCode.id, accessTokenPro, {
			tagIds: [tag1.id, tag2.id],
		});

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
		const tag1 = await createTagRequest(
			testServer,
			{ name: 'Replace A ' + Date.now() },
			accessToken,
		);
		const tag2 = await createTagRequest(
			testServer,
			{ name: 'Replace B ' + Date.now() },
			accessToken,
		);
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'Replace QR ' + Date.now());

		// Set first tag
		await setQrCodeTagsRequest(qrCode.id, accessToken, { tagIds: [tag1.id] });

		// Replace with second tag
		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [tag2.id],
		});

		expect(response.statusCode).toBe(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(1);
		expect(tags[0].id).toBe(tag2.id);
	});

	it('should default to empty tags when tagIds is omitted', async () => {
		const tag = await createTagRequest(
			testServer,
			{ name: 'Default Tag ' + Date.now() },
			accessToken,
		);
		const qrCode = await createQrCodeForTest(
			testServer,
			accessToken,
			'Default Body QR ' + Date.now(),
		);

		// First set a tag
		await setQrCodeTagsRequest(qrCode.id, accessToken, { tagIds: [tag.id] });

		// Then send empty body (tagIds defaults to [])
		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {});

		expect(response.statusCode).toBe(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(0);
	});
});
