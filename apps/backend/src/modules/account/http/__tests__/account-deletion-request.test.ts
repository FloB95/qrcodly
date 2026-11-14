import { container } from 'tsyringe';
import { type FastifyInstance } from 'fastify';
import { eq, inArray } from 'drizzle-orm';
import db from '@/core/db';
import { accountDeletionRequest } from '@/core/db/schemas';
import { API_BASE_PATH, ACCOUNT_DELETION_MAIL } from '@/core/config/constants';
import { Mailer } from '@/core/mailer/mailer';
import { ClerkUserInfoService } from '@/core/services/clerk-user-info.service';
import {
	getTestContext,
	resetTestState,
	TEST_USER_2_ID,
	TEST_USER_ID,
} from '@/tests/shared/test-context';

const DELETION_REQUEST_PATH = `${API_BASE_PATH}/account/deletion-request`;

describe('account deletion request', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let sendMail: jest.SpyInstance;

	const call = (method: 'GET' | 'POST' | 'DELETE', token?: string) =>
		testServer.inject({
			method,
			url: DELETION_REQUEST_PATH,
			headers: { Authorization: token ? `Bearer ${token}` : '' },
		});

	const storedRequest = async (userId: string) =>
		db.query.accountDeletionRequest.findFirst({
			where: eq(accountDeletionRequest.userId, userId),
		});

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
	});

	beforeEach(() => {
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
	});

	it('requires authentication', async () => {
		expect(await call('GET')).toHaveStatusCode(401);
		expect(await call('POST')).toHaveStatusCode(401);
		expect(await call('DELETE')).toHaveStatusCode(401);
	});

	it('reports no open request by default', async () => {
		const response = await call('GET', accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ requestedAt: null });
	});

	it('stores a request, reports it and tells support', async () => {
		const response = await call('POST', accessToken);

		expect(response).toHaveStatusCode(200);
		const { requestedAt } = JSON.parse(response.payload);
		expect(typeof requestedAt).toBe('string');

		const status = JSON.parse((await call('GET', accessToken)).payload);
		expect(status.requestedAt).toBe(requestedAt);

		const stored = await storedRequest(TEST_USER_ID);
		expect(stored?.revokedAt).toBeNull();

		expect(sendMail).toHaveBeenCalledTimes(1);
		const mail = sendMail.mock.calls[0][0];
		expect(mail.to).toBe(ACCOUNT_DELETION_MAIL);
		expect(mail.subject).toBe('Account deletion requested: owner@example.com');
		expect(mail.html).toContain(TEST_USER_ID);
	});

	it('does not create a second request or mail while one is open', async () => {
		const first = JSON.parse((await call('POST', accessToken)).payload);
		const second = JSON.parse((await call('POST', accessToken)).payload);

		expect(second.requestedAt).toBe(first.requestedAt);
		expect(sendMail).toHaveBeenCalledTimes(1);
	});

	it('withdraws an open request and tells support', async () => {
		await call('POST', accessToken);
		sendMail.mockClear();

		const response = await call('DELETE', accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ requestedAt: null });
		expect(JSON.parse((await call('GET', accessToken)).payload)).toEqual({ requestedAt: null });

		const stored = await storedRequest(TEST_USER_ID);
		expect(stored?.revokedAt).toBeInstanceOf(Date);

		expect(sendMail).toHaveBeenCalledTimes(1);
		expect(sendMail.mock.calls[0][0].subject).toBe('Account deletion withdrawn: owner@example.com');
	});

	it('does nothing when withdrawing without an open request', async () => {
		const response = await call('DELETE', accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ requestedAt: null });
		expect(sendMail).not.toHaveBeenCalled();
	});

	it('accepts a new request after a withdrawal', async () => {
		await call('POST', accessToken);
		await call('DELETE', accessToken);
		sendMail.mockClear();

		const response = await call('POST', accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload).requestedAt).not.toBeNull();
		expect((await storedRequest(TEST_USER_ID))?.revokedAt).toBeNull();
		expect(sendMail).toHaveBeenCalledTimes(1);
	});

	it('keeps requests per user', async () => {
		await call('POST', accessToken);

		const otherUser = JSON.parse((await call('GET', accessToken2)).payload);
		expect(otherUser).toEqual({ requestedAt: null });

		await call('DELETE', accessToken2);
		expect(JSON.parse((await call('GET', accessToken)).payload).requestedAt).not.toBeNull();
	});

	it('keeps the request when the mail to support fails', async () => {
		sendMail.mockRejectedValue(new Error('SMTP down'));

		const response = await call('POST', accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload).requestedAt).not.toBeNull();
		expect((await storedRequest(TEST_USER_ID))?.revokedAt).toBeNull();
	});
});
