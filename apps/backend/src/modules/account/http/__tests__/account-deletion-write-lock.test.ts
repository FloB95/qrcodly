import { container } from 'tsyringe';
import { type FastifyInstance } from 'fastify';
import { inArray } from 'drizzle-orm';
import db from '@/core/db';
import { accountDeletionRequest } from '@/core/db/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import { PlanName } from '@/core/config/plan.config';
import { Mailer } from '@/core/mailer/mailer';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import { CreateQrCodeUseCase } from '@/modules/qr-code/useCase/create-qr-code.use-case';
import { generateQrCodeDto } from '@/modules/qr-code/http/__tests__/utils';
import {
	getTestContext,
	resetTestState,
	TEST_USER_2_ID,
	TEST_USER_ID,
} from '@/tests/shared/test-context';

const DELETION_REQUEST_PATH = `${API_BASE_PATH}/account/deletion-request`;
const QR_CODE_PATH = `${API_BASE_PATH}/qr-code`;

describe('write lock while an account deletion is pending', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;

	const call = (
		method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
		url: string,
		token: string,
		payload?: object,
	) => testServer.inject({ method, url, headers: { Authorization: `Bearer ${token}` }, payload });

	const createOwnQrCode = async () =>
		container.resolve(CreateQrCodeUseCase).execute(generateQrCodeDto(), {
			id: TEST_USER_ID,
			plan: PlanName.FREE,
			tokenType: 'session_token',
		});

	const expectLocked = (response: Awaited<ReturnType<typeof call>>) => {
		expect(response).toHaveStatusCode(403);
		expect(JSON.parse(response.payload).errorCode).toBe('ACCOUNT_DELETION_PENDING');
	};

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	beforeEach(async () => {
		jest.spyOn(container.resolve(Mailer), 'sendMail').mockResolvedValue(undefined);
		jest
			.spyOn(container.resolve(ClerkUserInfoService), 'getUserInfo')
			.mockResolvedValue({ email: 'owner@example.com', firstName: 'Owner' });
	});

	afterEach(async () => {
		jest.restoreAllMocks();
		await db
			.delete(accountDeletionRequest)
			.where(inArray(accountDeletionRequest.userId, [TEST_USER_ID, TEST_USER_2_ID]))
			.execute();
	});

	it('rejects creating and changing', async () => {
		const qrCode = await createOwnQrCode();
		await call('POST', DELETION_REQUEST_PATH, accessToken);

		expectLocked(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto()));
		expectLocked(await call('PATCH', `${QR_CODE_PATH}/${qrCode.id}`, accessToken, { name: 'New' }));
		expectLocked(await call('POST', `${QR_CODE_PATH}/${qrCode.id}/duplicate`, accessToken));
		expectLocked(await call('POST', `${API_BASE_PATH}/tag`, accessToken, { name: 'New tag' }));
	});

	it('keeps reading and deleting possible', async () => {
		const [single, bulk] = await Promise.all([createOwnQrCode(), createOwnQrCode()]);
		await call('POST', DELETION_REQUEST_PATH, accessToken);

		expect(await call('GET', QR_CODE_PATH, accessToken)).toHaveStatusCode(200);
		expect(await call('GET', `${QR_CODE_PATH}/${single.id}`, accessToken)).toHaveStatusCode(200);
		expect(await call('DELETE', `${QR_CODE_PATH}/${single.id}`, accessToken)).toHaveStatusCode(200);

		const bulkDelete = await call('POST', `${QR_CODE_PATH}/bulk-delete`, accessToken, {
			ids: [bulk.id],
		});
		expect(bulkDelete).toHaveStatusCode(200);
		expect(JSON.parse(bulkDelete.payload).deleted).toBe(1);
	});

	it('lets the user request again and withdraw', async () => {
		await call('POST', DELETION_REQUEST_PATH, accessToken);

		expect(await call('POST', DELETION_REQUEST_PATH, accessToken)).toHaveStatusCode(200);
		expect(await call('DELETE', DELETION_REQUEST_PATH, accessToken)).toHaveStatusCode(200);
	});

	it('lifts the lock as soon as the request is withdrawn', async () => {
		await call('POST', DELETION_REQUEST_PATH, accessToken);
		expectLocked(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto()));

		await call('DELETE', DELETION_REQUEST_PATH, accessToken);

		expect(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto())).toHaveStatusCode(
			201,
		);
	});

	it('does not lock other users', async () => {
		await call('POST', DELETION_REQUEST_PATH, accessToken);

		expect(await call('POST', QR_CODE_PATH, accessToken2, generateQrCodeDto())).toHaveStatusCode(
			201,
		);
	});
});
