import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { TAG_API_PATH, createTagRequest, createQrCodeForTest } from './utils';

describe('setQrCodeTags', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

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
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	it('should set tags on a QR code', async () => {
		const tag = await createTagRequest(testServer, { name: 'QR Tag ' + Date.now() }, accessToken);
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'Tag Test QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [tag.id],
		});

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(Array.isArray(tags)).toBe(true);
		expect(tags.length).toBe(1);
		expect(tags[0].id).toBe(tag.id);
	});

	it('should clear tags when empty array is passed', async () => {
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'Clear Tag QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, { tagIds: [] });

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(0);
	});

	it('should return 401 without auth token', async () => {
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'No Auth QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, undefined, { tagIds: [] });

		expect(response).toHaveStatusCode(401);
	});

	it('should return 404 for non-existent QR code', async () => {
		const response = await setQrCodeTagsRequest(
			'00000000-0000-0000-0000-000000000000',
			accessToken,
			{ tagIds: [] },
		);

		expect(response).toHaveStatusCode(404);
	});

	it('should return 403 when setting tags on another user QR code', async () => {
		const tag = await createTagRequest(testServer, { name: 'IDOR Tag ' + Date.now() }, accessToken);
		const qrCode = await createQrCodeForTest(testServer, accessToken2, 'User2 QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [tag.id],
		});

		expect(response).toHaveStatusCode(403);
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

		expect(response).toHaveStatusCode(403);
	});

	it('should allow any user to set up to 3 tags', async () => {
		const tag1 = await createTagRequest(
			testServer,
			{ name: 'Multi Tag A ' + Date.now() },
			accessToken,
		);
		const tag2 = await createTagRequest(
			testServer,
			{ name: 'Multi Tag B ' + Date.now() },
			accessToken,
		);
		const tag3 = await createTagRequest(
			testServer,
			{ name: 'Multi Tag C ' + Date.now() },
			accessToken,
		);
		const qrCode = await createQrCodeForTest(testServer, accessToken, 'Multi Tag QR ' + Date.now());

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: [tag1.id, tag2.id, tag3.id],
		});

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(3);
	});

	it('should return 400 when trying to set more than 3 tags', async () => {
		const tags = await Promise.all(
			Array.from({ length: 4 }, (_, i) =>
				createTagRequest(testServer, { name: `Limit Tag ${i} ` + Date.now() }, accessToken),
			),
		);
		const qrCode = await createQrCodeForTest(
			testServer,
			accessToken,
			'Limit Test QR ' + Date.now(),
		);

		const response = await setQrCodeTagsRequest(qrCode.id, accessToken, {
			tagIds: tags.map((t) => t.id),
		});

		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload);
		expect(body.message).toContain('You can add a maximum of 3 tags');
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

		expect(response).toHaveStatusCode(200);
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

		expect(response).toHaveStatusCode(200);
		const tags = JSON.parse(response.payload);
		expect(tags).toHaveLength(0);
	});
});
