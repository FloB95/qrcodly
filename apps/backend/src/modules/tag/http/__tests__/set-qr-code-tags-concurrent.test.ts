import { getTestContext } from '@/tests/shared/test-context';
import { type FastifyInstance } from 'fastify';
import { TAG_API_PATH, createTagRequest, createQrCodeForTest } from './utils';

describe('setQrCodeTags concurrent', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	it('should handle concurrent tag updates without 500 errors', async () => {
		const tag1 = await createTagRequest(testServer, { name: 'Conc A ' + Date.now() }, accessToken);
		const tag2 = await createTagRequest(testServer, { name: 'Conc B ' + Date.now() }, accessToken);
		const tag3 = await createTagRequest(testServer, { name: 'Conc C ' + Date.now() }, accessToken);
		const qrCode = await createQrCodeForTest(
			testServer,
			accessToken,
			'Concurrent QR ' + Date.now(),
		);

		const tagSets = [[tag1.id], [tag2.id], [tag1.id, tag2.id], [tag3.id], [tag1.id, tag3.id]];

		const responses = await Promise.all(
			tagSets.map((tagIds) =>
				testServer.inject({
					method: 'PUT',
					url: `${TAG_API_PATH}/qr-code/${qrCode.id}`,
					headers: { Authorization: `Bearer ${accessToken}` },
					payload: { tagIds },
				}),
			),
		);

		// No 500 errors — all should be 200 or 409
		for (const response of responses) {
			expect([200, 409]).toContain(response.statusCode);
		}

		// At least one should have succeeded
		const successes = responses.filter((r) => r.statusCode === 200);
		expect(successes.length).toBeGreaterThanOrEqual(1);

		// Final state should be consistent — one of the tag sets
		const finalResponse = await testServer.inject({
			method: 'PUT',
			url: `${TAG_API_PATH}/qr-code/${qrCode.id}`,
			headers: { Authorization: `Bearer ${accessToken}` },
			payload: { tagIds: [tag1.id] },
		});
		expect(finalResponse.statusCode).toBe(200);
		const finalTags = JSON.parse(finalResponse.payload);
		expect(finalTags).toHaveLength(1);
		expect(finalTags[0].id).toBe(tag1.id);
	});
});
