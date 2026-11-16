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
import AccountDeletionRequestRepository from '../../domain/repository/account-deletion-request.repository';
import { AccountWriteLockService } from '../../service/account-write-lock.service';
import {
	getTestContext,
	resetTestState,
	TEST_USER_2_ID,
	TEST_USER_ID,
} from '@/tests/shared/test-context';

const DELETION_REQUEST_PATH = `${API_BASE_PATH}/account/deletion-request`;
const QR_CODE_PATH = `${API_BASE_PATH}/qr-code`;

describe('write lock once an account deletion is confirmed', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let sendMail: jest.SpyInstance;

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

	/** Requests the deletion and opens the link from the confirmation mail */
	const requestAndConfirm = async (token: string) => {
		await call('POST', DELETION_REQUEST_PATH, token);
		const html = sendMail.mock.calls[sendMail.mock.calls.length - 1][0].html as string;
		const secret = /account-deletion\/confirm#token=([\w-]+)/.exec(html)![1];
		await testServer.inject({
			method: 'POST',
			url: `${DELETION_REQUEST_PATH}/confirm`,
			payload: { token: secret },
		});
	};

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
		sendMail = jest.spyOn(container.resolve(Mailer), 'sendMail').mockResolvedValue(undefined);
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
		// the rows are removed behind the lock's back, so its cached answer has to go as well
		const writeLock = container.resolve(AccountWriteLockService);
		await Promise.all([writeLock.forget(TEST_USER_ID), writeLock.forget(TEST_USER_2_ID)]);
	});

	it('does not lock while the confirmation by mail is outstanding', async () => {
		await call('POST', DELETION_REQUEST_PATH, accessToken);

		expect(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto())).toHaveStatusCode(
			201,
		);
	});

	it('rejects creating and changing', async () => {
		const qrCode = await createOwnQrCode();
		await requestAndConfirm(accessToken);

		expectLocked(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto()));
		expectLocked(await call('PATCH', `${QR_CODE_PATH}/${qrCode.id}`, accessToken, { name: 'New' }));
		expectLocked(await call('POST', `${QR_CODE_PATH}/${qrCode.id}/duplicate`, accessToken));
		expectLocked(await call('POST', `${API_BASE_PATH}/tag`, accessToken, { name: 'New tag' }));
	});

	it('keeps reading and deleting possible', async () => {
		const [single, bulk] = await Promise.all([createOwnQrCode(), createOwnQrCode()]);
		await requestAndConfirm(accessToken);

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
		await requestAndConfirm(accessToken);

		expect(await call('POST', DELETION_REQUEST_PATH, accessToken)).toHaveStatusCode(200);
		expect(await call('DELETE', DELETION_REQUEST_PATH, accessToken)).toHaveStatusCode(200);
	});

	it('lifts the lock as soon as the request is withdrawn', async () => {
		await requestAndConfirm(accessToken);
		expectLocked(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto()));

		await call('DELETE', DELETION_REQUEST_PATH, accessToken);

		expect(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto())).toHaveStatusCode(
			201,
		);
	});

	it('locks at once, also right after the account was seen as writable', async () => {
		expect(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto())).toHaveStatusCode(
			201,
		);

		await requestAndConfirm(accessToken);

		expectLocked(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto()));
	});

	it('asks the database once and then answers from the cache', async () => {
		await requestAndConfirm(accessToken);
		const lookup = jest.spyOn(
			container.resolve(AccountDeletionRequestRepository),
			'findConfirmedByUserId',
		);

		expectLocked(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto()));
		expectLocked(await call('POST', QR_CODE_PATH, accessToken, generateQrCodeDto()));

		expect(lookup).toHaveBeenCalledTimes(1);
	});

	it('does not lock other users', async () => {
		await requestAndConfirm(accessToken);

		expect(await call('POST', QR_CODE_PATH, accessToken2, generateQrCodeDto())).toHaveStatusCode(
			201,
		);
	});
});
