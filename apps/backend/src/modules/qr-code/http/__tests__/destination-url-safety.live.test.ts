// Live tests: dynamic QR codes must reject malicious destinations. Gated on
// GOOGLE_WEB_RISK_API_KEY (skipped without it); per-test Redis reset avoids banning the shared user.
import { container } from 'tsyringe';
import {
	getTestContext as getGlobalTestContext,
	resetTestState,
	TEST_USER_ID,
} from '@/tests/shared/test-context';
import { UserBanService } from '@/core/auth';
import { KeyCache } from '@/core/cache';
import { env } from '@/core/config/env';
import type { FastifyInstance } from 'fastify';
import type { TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { QR_CODE_API_PATH, generateDynamicUrlQrCodeDto } from './utils';

const PHISHING_TEST_URL = 'https://testsafebrowsing.appspot.com/s/phishing.html';

const describeLive = env.GOOGLE_WEB_RISK_API_KEY ? describe : describe.skip;

describeLive('dynamic QR code destinationUrl safety — live Web Risk', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getGlobalTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		// clear any persisted ban for the shared user so leftover state can't fail the suite
		await container.resolve(UserBanService).unban(TEST_USER_ID);
	});

	beforeEach(async () => {
		const client = container.resolve(KeyCache).getClient();
		await client.del(`url_safety:violations:${TEST_USER_ID}`);
		await client.del(`url_safety:violations:urls:${TEST_USER_ID}`);
	});

	const createQrCode = (payload: object) =>
		testServer.inject({
			method: 'POST',
			url: QR_CODE_API_PATH,
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
			payload,
		});

	it('blocks creating a dynamic URL QR code with a phishing destination', async () => {
		const dto = generateDynamicUrlQrCodeDto();
		const response = await createQrCode({
			...dto,
			content: { type: 'url', data: { url: PHISHING_TEST_URL, isDynamic: true } },
		});
		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload) as { errorCode?: string };
		expect(body.errorCode).toBe('MALICIOUS_DESTINATION_URL');
	});

	it('blocks updating a dynamic URL QR code to a phishing destination', async () => {
		// Create a dynamic URL QR code with a safe destination first.
		const created = await createQrCode(generateDynamicUrlQrCodeDto());
		expect(created).toHaveStatusCode(201);
		const qrCode = JSON.parse(created.payload) as TQrCodeWithRelationsResponseDto;

		const response = await testServer.inject({
			method: 'PATCH',
			url: `${QR_CODE_API_PATH}/${qrCode.id}`,
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
			payload: { content: { type: 'url', data: { url: PHISHING_TEST_URL, isDynamic: true } } },
		});
		expect(response).toHaveStatusCode(400);
		const body = JSON.parse(response.payload) as { errorCode?: string };
		expect(body.errorCode).toBe('MALICIOUS_DESTINATION_URL');
	});
});
