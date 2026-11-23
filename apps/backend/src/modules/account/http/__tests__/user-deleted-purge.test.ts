import { container } from 'tsyringe';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { faker } from '@faker-js/faker';
import { QrCodeDefaults } from '@shared/schemas';
import type Stripe from 'stripe';
import db from '@/core/db';
import {
	accountDeletionRequest,
	configTemplate,
	customDomain,
	qrCode,
	shortUrl,
	tag,
	userSafetyStanding,
	userSubscription,
	userSurvey,
} from '@/core/db/schemas';
import { ACCOUNT_DELETION_MAIL, API_BASE_PATH } from '@/core/config/constants';
import { EventEmitter } from '@/core/event/event.emitter';
import { UserDeletedEvent } from '@/core/event/user-deleted.event';
import { Mailer } from '@/core/mailer/mailer';
import {
	getTestContext,
	resetTestState,
	TEST_USER_2_ID,
	TEST_USER_ID,
	type TestContext,
} from '@/tests/shared/test-context';
import { generateMockCustomDomain } from '@/tests/shared/factories/custom-domain.factory';
import {
	createQrCodeRequest,
	generateDynamicUrlQrCodeDto,
	generateQrCodeDto,
} from '@/modules/qr-code/http/__tests__/utils';
import { createShortUrl } from '@/modules/url-shortener/http/__tests__/utils';
import { createTagRequest } from '@/modules/tag/http/__tests__/utils';
import CustomDomainRepository from '@/modules/custom-domain/domain/repository/custom-domain.repository';
import UserSafetyStandingRepository from '@/modules/url-shortener/domain/repository/user-safety-standing.repository';
import { StripeService } from '@/modules/billing/service/stripe.service';
import { ListApiKeysUseCase } from '@/modules/api-key/useCase/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from '@/modules/api-key/useCase/revoke-api-key.use-case';
import { DeleteTagUseCase } from '@/modules/tag/useCase/delete-tag.use-case';

const DELETED_USER = TEST_USER_2_ID;
const STORED_EMAIL = 'leaving@example.com';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(check: () => Promise<boolean>, what: string): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt++) {
		if (await check()) return;
		await sleep(100);
	}
	throw new Error(`Timed out waiting for: ${what}`);
}

const rowsOf = async (table: typeof qrCode | typeof tag | typeof configTemplate, userId: string) =>
	db.select().from(table).where(eq(table.createdBy, userId)).execute();

describe('purging a deleted user', () => {
	let ctx: TestContext;
	let sendMail: jest.SpyInstance;
	let cancelSubscriptionNow: jest.SpyInstance;
	let revokeApiKey: jest.SpyInstance;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
	});

	beforeEach(() => {
		sendMail = jest.spyOn(container.resolve(Mailer), 'sendMail').mockResolvedValue(undefined);
		const stripe = container.resolve(StripeService);
		jest
			.spyOn(stripe, 'listSubscriptionsForCustomer')
			.mockResolvedValue([
				{ id: 'sub_live', status: 'active', schedule: null } as Stripe.Subscription,
				{ id: 'sub_ended', status: 'canceled', schedule: null } as Stripe.Subscription,
			]);
		cancelSubscriptionNow = jest.spyOn(stripe, 'cancelSubscriptionNow').mockResolvedValue();
		// the test users are real Clerk users, so their keys must not be revoked for real
		jest
			.spyOn(ListApiKeysUseCase.prototype, 'execute')
			.mockResolvedValueOnce([{ id: 'ak_test' } as never])
			.mockResolvedValue([]);
		revokeApiKey = jest.spyOn(RevokeApiKeyUseCase.prototype, 'execute').mockResolvedValue();
	});

	const alerts = () =>
		sendMail.mock.calls
			.map(([mail]) => mail)
			.filter((mail) => mail.template === 'account-deletion-cleanup-failed');

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("deletes everything the user had through the normal delete paths and keeps other users' data", async () => {
		const { testServer, accessToken, accessToken2 } = ctx;

		const dynamicQr = await createQrCodeRequest(
			testServer,
			generateDynamicUrlQrCodeDto(),
			accessToken2,
		);
		expect(dynamicQr).toHaveStatusCode(201);
		const dynamicQrId = JSON.parse(dynamicQr.payload).id as string;
		expect(
			await createQrCodeRequest(testServer, generateQrCodeDto(), accessToken2),
		).toHaveStatusCode(201);
		const standalone = await createShortUrl(testServer, accessToken2);
		await createTagRequest(testServer, { name: `Leaving ${Date.now()}` }, accessToken2);
		const template = await testServer.inject({
			method: 'POST',
			url: `${API_BASE_PATH}/config-template`,
			headers: { Authorization: `Bearer ${accessToken2}` },
			payload: { name: faker.lorem.words(2), config: QrCodeDefaults },
		});
		expect(template).toHaveStatusCode(201);

		const otherQr = await createQrCodeRequest(testServer, generateQrCodeDto(), accessToken);
		expect(otherQr).toHaveStatusCode(201);
		const otherQrId = JSON.parse(otherQr.payload).id as string;

		const [dynamicLink] = await db
			.select()
			.from(shortUrl)
			.where(eq(shortUrl.qrCodeId, dynamicQrId))
			.execute();
		expect(dynamicLink).toBeDefined();

		await container
			.resolve(CustomDomainRepository)
			.create(generateMockCustomDomain({ id: randomUUID(), createdBy: DELETED_USER }));
		await container.resolve(UserSafetyStandingRepository).findOrCreate(DELETED_USER);
		await db
			.insert(userSurvey)
			.values({ id: randomUUID(), userId: DELETED_USER, rating: 'down', createdAt: new Date() })
			.execute();
		const now = new Date();
		await db
			.insert(userSubscription)
			.values({
				id: randomUUID(),
				userId: DELETED_USER,
				stripeCustomerId: 'cus_leaving',
				stripeSubscriptionId: `sub_${randomUUID()}`,
				stripePriceId: 'price_test',
				status: 'active',
				currentPeriodStart: now,
				currentPeriodEnd: now,
				createdAt: now,
				updatedAt: now,
			})
			.execute();
		// added last: a confirmed request makes the account read-only
		await db
			.insert(accountDeletionRequest)
			.values({
				id: randomUUID(),
				userId: DELETED_USER,
				requestedAt: now,
				confirmedAt: now,
				email: STORED_EMAIL,
			})
			.execute();

		container.resolve(EventEmitter).emit(new UserDeletedEvent({ id: DELETED_USER }));

		await waitUntil(async () => {
			const [qrCodes, tags, templates, domains, surveys, standings, subscriptions, requests] =
				await Promise.all([
					rowsOf(qrCode, DELETED_USER),
					rowsOf(tag, DELETED_USER),
					rowsOf(configTemplate, DELETED_USER),
					db.select().from(customDomain).where(eq(customDomain.createdBy, DELETED_USER)),
					db.select().from(userSurvey).where(eq(userSurvey.userId, DELETED_USER)),
					db.select().from(userSafetyStanding).where(eq(userSafetyStanding.userId, DELETED_USER)),
					db.select().from(userSubscription).where(eq(userSubscription.userId, DELETED_USER)),
					db
						.select()
						.from(accountDeletionRequest)
						.where(eq(accountDeletionRequest.userId, DELETED_USER)),
				]);
			const liveLinks = await db
				.select()
				.from(shortUrl)
				.where(eq(shortUrl.createdBy, DELETED_USER))
				.execute();
			return (
				[qrCodes, tags, templates, domains, surveys, standings, subscriptions, requests].every(
					(rows) => rows.length === 0,
				) && liveLinks.every((link) => link.deletedAt !== null)
			);
		}, 'all data of the deleted user to be gone');

		// short codes stay as soft-deleted rows, so they are never handed out again
		for (const shortCode of [dynamicLink.shortCode, standalone.shortCode]) {
			const [row] = await db
				.select()
				.from(shortUrl)
				.where(eq(shortUrl.shortCode, shortCode))
				.execute();
			expect(row?.deletedAt).toBeInstanceOf(Date);
		}

		expect(cancelSubscriptionNow).toHaveBeenCalledTimes(1);
		expect(cancelSubscriptionNow).toHaveBeenCalledWith(expect.objectContaining({ id: 'sub_live' }));
		expect(revokeApiKey).toHaveBeenCalledWith('ak_test', DELETED_USER);

		const goodbye = sendMail.mock.calls
			.map(([mail]) => mail)
			.filter((mail) => mail.template === 'account-deleted');
		expect(goodbye).toEqual([expect.objectContaining({ to: STORED_EMAIL })]);

		const [stillThere] = await db.select().from(qrCode).where(eq(qrCode.id, otherQrId)).execute();
		expect(stillThere?.createdBy).toBe(TEST_USER_ID);
		expect(alerts()).toEqual([]);
	});

	it('tells support when a step keeps failing, and the other steps still go through', async () => {
		await createTagRequest(ctx.testServer, { name: `Stuck ${Date.now()}` }, ctx.accessToken2);
		const deleteTag = jest
			.spyOn(DeleteTagUseCase.prototype, 'execute')
			.mockRejectedValue(new Error('tag table locked'));
		await db
			.insert(userSurvey)
			.values({ id: randomUUID(), userId: DELETED_USER, rating: 'up', createdAt: new Date() })
			.execute();

		container.resolve(EventEmitter).emit(new UserDeletedEvent({ id: DELETED_USER }));

		await waitUntil(async () => alerts().length > 0, 'the alert to support');
		expect(alerts()).toEqual([
			expect.objectContaining({
				to: ACCOUNT_DELETION_MAIL,
				subject: `Account deletion incomplete: tag (${DELETED_USER})`,
			}),
		]);
		expect(alerts()[0].html).toContain('tag table locked');
		expect(deleteTag).toHaveBeenCalledTimes(3);
		expect(await rowsOf(tag, DELETED_USER)).toHaveLength(1);
		await waitUntil(
			async () =>
				(await db.select().from(userSurvey).where(eq(userSurvey.userId, DELETED_USER))).length ===
				0,
			'the survey to be gone',
		);

		await db.delete(tag).where(eq(tag.createdBy, DELETED_USER)).execute();
	});
});
