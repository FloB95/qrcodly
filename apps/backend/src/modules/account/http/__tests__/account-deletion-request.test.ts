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
import AccountDeletionRequestRepository from '../../domain/repository/account-deletion-request.repository';
import { AccountWriteLockService } from '../../service/account-write-lock.service';
import { hashConfirmationToken } from '../../service/confirmation-token';

const DELETION_REQUEST_PATH = `${API_BASE_PATH}/account/deletion-request`;
const OWNER_MAIL = 'owner@example.com';

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

	// deliberately without a session: the link may be opened on another device
	const confirm = (token: string) =>
		testServer.inject({
			method: 'POST',
			url: `${DELETION_REQUEST_PATH}/confirm`,
			payload: { token },
		});

	const mailsWith = (template: string) =>
		sendMail.mock.calls.map(([mail]) => mail).filter((mail) => mail.template === template);
	const confirmationMails = () => mailsWith('account-deletion-confirm');
	const supportMails = () => mailsWith('account-deletion-admin-alert');

	/** The secret from the newest confirmation mail */
	const mailedToken = (): string => {
		const mails = confirmationMails();
		const html = mails[mails.length - 1].html as string;
		return /account-deletion\/confirm#token=([\w-]+)/.exec(html)![1];
	};

	const storedRequest = async (userId: string) =>
		db.query.accountDeletionRequest.findFirst({
			where: eq(accountDeletionRequest.userId, userId),
		});

	const expectLinkInvalid = (response: Awaited<ReturnType<typeof confirm>>) => {
		expect(response).toHaveStatusCode(400);
		expect(JSON.parse(response.payload).errorCode).toBe('ACCOUNT_DELETION_LINK_INVALID');
	};

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
			.mockResolvedValue({ email: OWNER_MAIL, firstName: 'Owner' });
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

	it('requires authentication to read, request and withdraw', async () => {
		expect(await call('GET')).toHaveStatusCode(401);
		expect(await call('POST')).toHaveStatusCode(401);
		expect(await call('DELETE')).toHaveStatusCode(401);
	});

	it('reports no open request by default', async () => {
		const response = await call('GET', accessToken);

		expect(response).toHaveStatusCode(200);
		expect(JSON.parse(response.payload)).toEqual({ requestedAt: null, confirmedAt: null });
	});

	describe('requesting', () => {
		it('mails the owner a confirmation link and tells support nothing yet', async () => {
			const response = await call('POST', accessToken);

			expect(response).toHaveStatusCode(200);
			const body = JSON.parse(response.payload);
			expect(typeof body.requestedAt).toBe('string');
			expect(body.confirmedAt).toBeNull();
			expect(JSON.parse((await call('GET', accessToken)).payload)).toEqual(body);

			expect(confirmationMails()).toHaveLength(1);
			expect(confirmationMails()[0].to).toBe(OWNER_MAIL);
			expect(confirmationMails()[0].html).toContain(
				'https://test.qrcodly.de/account-deletion/confirm#token=',
			);
			expect(supportMails()).toHaveLength(0);
		});

		it('stores only a hash of the secret in the link', async () => {
			await call('POST', accessToken);

			const stored = await storedRequest(TEST_USER_ID);
			expect(stored?.confirmedAt).toBeNull();
			expect(stored?.confirmationTokenHash).toBe(hashConfirmationToken(mailedToken()));
			expect(stored?.confirmationExpiresAt!.getTime()).toBeGreaterThan(Date.now());
		});

		it('sends a fresh link when asked again, and only that one works', async () => {
			await call('POST', accessToken);
			const firstToken = mailedToken();
			await call('POST', accessToken);
			const secondToken = mailedToken();

			expect(confirmationMails()).toHaveLength(2);
			expect(secondToken).not.toBe(firstToken);
			expectLinkInvalid(await confirm(firstToken));
			expect(await confirm(secondToken)).toHaveStatusCode(200);
		});

		it('fails when the confirmation mail cannot be sent, and works on the next try', async () => {
			sendMail.mockRejectedValueOnce(new Error('SMTP down'));

			expect((await call('POST', accessToken)).statusCode).toBeGreaterThanOrEqual(500);

			expect(await call('POST', accessToken)).toHaveStatusCode(200);
			expect(await confirm(mailedToken())).toHaveStatusCode(200);
		});

		it('fails when the account has no mail address to confirm with', async () => {
			jest.spyOn(container.resolve(ClerkUserInfoService), 'getUserInfo').mockResolvedValue({
				email: '',
			});

			expect(await call('POST', accessToken)).toHaveStatusCode(503);
			expect(sendMail).not.toHaveBeenCalled();
		});
	});

	describe('confirming', () => {
		it('counts the request from then on and tells support', async () => {
			const requested = JSON.parse((await call('POST', accessToken)).payload);

			const response = await confirm(mailedToken());

			expect(response).toHaveStatusCode(200);
			const body = JSON.parse(response.payload);
			expect(body.requestedAt).toBe(requested.requestedAt);
			expect(typeof body.confirmedAt).toBe('string');
			expect(JSON.parse((await call('GET', accessToken)).payload)).toEqual(body);

			expect(supportMails()).toHaveLength(1);
			expect(supportMails()[0].to).toBe(ACCOUNT_DELETION_MAIL);
			expect(supportMails()[0].subject).toBe(`Account deletion requested: ${OWNER_MAIL}`);
			expect(supportMails()[0].html).toContain(TEST_USER_ID);
		});

		it('changes nothing when the link is opened a second time', async () => {
			await call('POST', accessToken);
			const first = JSON.parse((await confirm(mailedToken())).payload);

			const second = await confirm(mailedToken());

			expect(second).toHaveStatusCode(200);
			expect(JSON.parse(second.payload)).toEqual(first);
			expect(supportMails()).toHaveLength(1);
		});

		it('does not mail the owner again once confirmed', async () => {
			await call('POST', accessToken);
			const confirmed = JSON.parse((await confirm(mailedToken())).payload);

			const again = await call('POST', accessToken);

			expect(JSON.parse(again.payload)).toEqual(confirmed);
			expect(confirmationMails()).toHaveLength(1);
		});

		it('rejects an unknown link', async () => {
			await call('POST', accessToken);

			expectLinkInvalid(await confirm('x'.repeat(43)));
			expect((await storedRequest(TEST_USER_ID))?.confirmedAt).toBeNull();
		});

		it('rejects a link that has run out', async () => {
			await call('POST', accessToken);
			await db
				.update(accountDeletionRequest)
				.set({ confirmationExpiresAt: new Date(Date.now() - 60_000) })
				.where(eq(accountDeletionRequest.userId, TEST_USER_ID))
				.execute();

			expectLinkInvalid(await confirm(mailedToken()));
			expect(supportMails()).toHaveLength(0);
		});

		it('does not confirm a request withdrawn while its link was being checked', async () => {
			await call('POST', accessToken);
			const token = mailedToken();
			const repository = container.resolve(AccountDeletionRequestRepository);
			const readBeforeWithdrawal = await repository.findOpenByConfirmationTokenHash(
				hashConfirmationToken(token),
			);
			await call('DELETE', accessToken);
			jest
				.spyOn(repository, 'findOpenByConfirmationTokenHash')
				.mockResolvedValueOnce(readBeforeWithdrawal);

			expectLinkInvalid(await confirm(token));
			expect((await storedRequest(TEST_USER_ID))?.confirmedAt).toBeNull();
			expect(supportMails()).toHaveLength(0);
		});

		it('does not confirm when the link runs out between the check and the write', async () => {
			await call('POST', accessToken);
			const stored = (await storedRequest(TEST_USER_ID))!;
			const afterExpiry = new Date(stored.confirmationExpiresAt!.getTime() + 1000);

			const confirmed = await container
				.resolve(AccountDeletionRequestRepository)
				.confirm(stored.id, stored.confirmationTokenHash!, afterExpiry);

			expect(confirmed).toBe(false);
			expect((await storedRequest(TEST_USER_ID))?.confirmedAt).toBeNull();
		});

		it('stays confirmed when the mail to support fails', async () => {
			await call('POST', accessToken);
			sendMail.mockRejectedValueOnce(new Error('SMTP down'));

			const response = await confirm(mailedToken());

			expect(response).toHaveStatusCode(200);
			expect((await storedRequest(TEST_USER_ID))?.confirmedAt).toBeInstanceOf(Date);
		});
	});

	describe('withdrawing', () => {
		it('withdraws an unconfirmed request silently and kills its link', async () => {
			await call('POST', accessToken);

			const response = await call('DELETE', accessToken);

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ requestedAt: null, confirmedAt: null });
			expect(supportMails()).toHaveLength(0);
			expectLinkInvalid(await confirm(mailedToken()));
		});

		it('withdraws a confirmed request and tells support', async () => {
			await call('POST', accessToken);
			await confirm(mailedToken());
			sendMail.mockClear();

			const response = await call('DELETE', accessToken);

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse((await call('GET', accessToken)).payload)).toEqual({
				requestedAt: null,
				confirmedAt: null,
			});
			expect((await storedRequest(TEST_USER_ID))?.revokedAt).toBeInstanceOf(Date);
			expect(supportMails()).toHaveLength(1);
			expect(supportMails()[0].subject).toBe(`Account deletion withdrawn: ${OWNER_MAIL}`);
		});

		it('tells support when the confirmation landed while the request was being withdrawn', async () => {
			await call('POST', accessToken);
			const repository = container.resolve(AccountDeletionRequestRepository);
			const readBeforeConfirmation = await repository.findActiveByUserId(TEST_USER_ID);
			await confirm(mailedToken());
			sendMail.mockClear();
			jest.spyOn(repository, 'findActiveByUserId').mockResolvedValueOnce(readBeforeConfirmation);

			expect(await call('DELETE', accessToken)).toHaveStatusCode(200);

			expect(supportMails()).toHaveLength(1);
			expect(supportMails()[0].subject).toBe(`Account deletion withdrawn: ${OWNER_MAIL}`);
		});

		it('does nothing without an open request', async () => {
			const response = await call('DELETE', accessToken);

			expect(response).toHaveStatusCode(200);
			expect(sendMail).not.toHaveBeenCalled();
		});

		it('needs a new confirmation for a request made after a withdrawal', async () => {
			await call('POST', accessToken);
			await confirm(mailedToken());
			await call('DELETE', accessToken);
			sendMail.mockClear();

			const response = await call('POST', accessToken);

			expect(JSON.parse(response.payload).confirmedAt).toBeNull();
			expect(confirmationMails()).toHaveLength(1);
			expect(supportMails()).toHaveLength(0);
		});
	});

	it('keeps requests per user', async () => {
		await call('POST', accessToken);
		await confirm(mailedToken());

		expect(JSON.parse((await call('GET', accessToken2)).payload)).toEqual({
			requestedAt: null,
			confirmedAt: null,
		});

		await call('DELETE', accessToken2);
		expect(JSON.parse((await call('GET', accessToken)).payload).confirmedAt).not.toBeNull();
	});
});
