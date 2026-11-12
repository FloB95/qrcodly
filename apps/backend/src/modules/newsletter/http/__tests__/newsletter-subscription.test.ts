import { type FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { API_BASE_PATH } from '@/core/config/constants';
import { ROUTE_METADATA_KEY, type RouteMetadata } from '@/core/decorators/route';
import { getTestContext, resetTestState, TEST_USER_ID } from '@/tests/shared/test-context';
import { ListmonkApiError, ListmonkClient, type IListmonkSubscriber } from '@/libs/listmonk';
import { NewsletterSyncService } from '../../service/newsletter-sync.service';
import { NewsletterController } from '../controller/newsletter.controller';

const SUBSCRIPTION_PATH = `${API_BASE_PATH}/newsletter/subscription`;
const LIST_ID = 7;
const INTERACTIVE = { interactive: true };

const subscriber = (overrides: Partial<IListmonkSubscriber> = {}): IListmonkSubscriber => ({
	id: 10,
	email: 'jane@example.com',
	name: 'Jane',
	status: 'enabled',
	attribs: { clerk_user_id: TEST_USER_ID, locale: 'en', locale_source: 'auto', source: 'sync' },
	lists: [{ id: LIST_ID, subscription_status: 'confirmed' }],
	...overrides,
});

/** listmonk is never contacted: every client call is spied */
describe('newsletter subscription', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let listmonk: ListmonkClient;

	const getRequest = (token?: string) =>
		testServer.inject({
			method: 'GET',
			url: SUBSCRIPTION_PATH,
			headers: { Authorization: token ? `Bearer ${token}` : '' },
		});

	const putRequest = (body: unknown, token: string | undefined = accessToken) =>
		testServer.inject({
			method: 'PUT',
			url: SUBSCRIPTION_PATH,
			headers: {
				'Content-Type': 'application/json',
				Authorization: token ? `Bearer ${token}` : '',
			},
			payload: body as Record<string, unknown>,
		});

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	beforeEach(() => {
		listmonk = container.resolve(ListmonkClient);
		jest.spyOn(listmonk, 'isEnabled').mockReturnValue(true);
		jest.spyOn(listmonk, 'getListId').mockReturnValue(LIST_ID);
		jest.spyOn(listmonk, 'findSubscribers').mockResolvedValue([]);
		jest.spyOn(listmonk, 'createSubscriber').mockResolvedValue(subscriber());
		jest.spyOn(listmonk, 'updateSubscriber').mockResolvedValue();
		jest.spyOn(listmonk, 'addToList').mockResolvedValue();
		jest.spyOn(listmonk, 'unsubscribeFromList').mockResolvedValue();
		jest.spyOn(container.resolve(NewsletterSyncService), 'getUser').mockResolvedValue({
			id: TEST_USER_ID,
			email: 'jane@example.com',
			firstName: 'Jane',
			locale: 'en',
			banned: false,
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	// hidden routes accept session tokens only, so API keys get 403 (see registerRoutes)
	it('keeps both routes hidden, without letting API keys in', () => {
		const routes = Reflect.getMetadata(ROUTE_METADATA_KEY, NewsletterController) as RouteMetadata[];

		expect(
			routes
				.map((route) => ({
					route: `${route.method.toUpperCase()} ${route.path}`,
					hidden: route.options.schema?.hide,
					allowedTokenTypes: route.options.config?.allowedTokenTypes,
				}))
				.sort((a, b) => a.route.localeCompare(b.route)),
		).toEqual([
			{ route: 'GET /subscription', hidden: true, allowedTokenTypes: undefined },
			{ route: 'PUT /subscription', hidden: true, allowedTokenTypes: undefined },
		]);
	});

	describe('GET', () => {
		it('returns 401 without a token', async () => {
			const response = await getRequest();

			expect(response).toHaveStatusCode(401);
		});

		it('is disabled when listmonk is not configured', async () => {
			jest.spyOn(listmonk, 'isEnabled').mockReturnValue(false);

			const response = await getRequest(accessToken);

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'disabled', locale: null });
		});

		it.each([
			['subscribed', 'en', [subscriber()]],
			[
				'subscribed',
				'en',
				[subscriber({ lists: [{ id: LIST_ID, subscription_status: 'unconfirmed' }] })],
			],
			[
				'unsubscribed',
				'en',
				[subscriber({ lists: [{ id: LIST_ID, subscription_status: 'unsubscribed' }] })],
			],
			[
				'subscribed',
				'de',
				[
					subscriber({
						attribs: { clerk_user_id: TEST_USER_ID, locale: 'de', locale_source: 'user' },
					}),
				],
			],
			[
				'subscribed',
				'de',
				[
					subscriber({
						attribs: { clerk_user_id: TEST_USER_ID, locale: 'de', locale_source: 'auto' },
					}),
				],
			],
			// nothing stored: the campaign falls back to English
			['subscribed', 'en', [subscriber({ attribs: { clerk_user_id: TEST_USER_ID } })]],
			['blocked', null, [subscriber({ status: 'blocklisted' })]],
			// the account moved onto an address another subscriber has blocklisted
			[
				'blocked',
				null,
				[
					subscriber({ email: 'old@example.com' }),
					subscriber({ id: 11, status: 'blocklisted', attribs: {}, lists: [] }),
				],
			],
			// the sync will add the account
			['subscribed', 'en', []],
		])('returns %s in %s', async (status, locale, found) => {
			jest.spyOn(listmonk, 'findSubscribers').mockResolvedValue(found);

			const response = await getRequest(accessToken);

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status, locale });
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('is unavailable without a subscriber when the account has no verified email', async () => {
			jest.spyOn(container.resolve(NewsletterSyncService), 'getUser').mockResolvedValue({
				id: TEST_USER_ID,
				email: null,
				firstName: 'Jane',
				locale: 'en',
				banned: false,
			});

			const response = await getRequest(accessToken);

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'unavailable', locale: null });
		});

		it('is unavailable when listmonk fails', async () => {
			jest.spyOn(listmonk, 'findSubscribers').mockRejectedValue(new ListmonkApiError(500, 'x'));

			const response = await getRequest(accessToken);

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'unavailable', locale: null });
		});
	});

	describe('PUT', () => {
		it('returns 401 without a token', async () => {
			const response = await putRequest({ subscribed: true, locale: 'de' }, '');

			expect(response).toHaveStatusCode(401);
		});

		it.each([
			['a wrong type', { subscribed: 'yes' }],
			['neither a toggle nor a language', {}],
			['a language there is no newsletter in', { subscribed: true, locale: 'fr' }],
		])('rejects a body with %s', async (_, body) => {
			const response = await putRequest(body);

			expect(response).toHaveStatusCode(400);
			expect(listmonk.findSubscribers).not.toHaveBeenCalled();
		});

		it('subscribes a new subscriber with the settings source and the sign-up language', async () => {
			const response = await putRequest({ subscribed: true });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'subscribed', locale: 'en' });
			expect(listmonk.findSubscribers).toHaveBeenCalledWith(
				{ attribute: { key: 'clerk_user_id', value: TEST_USER_ID }, email: 'jane@example.com' },
				INTERACTIVE,
			);
			expect(listmonk.createSubscriber).toHaveBeenCalledWith(
				{
					email: 'jane@example.com',
					name: 'Jane',
					attribs: {
						clerk_user_id: TEST_USER_ID,
						locale: 'en',
						locale_source: 'auto',
						source: 'settings',
					},
					listIds: [LIST_ID],
				},
				INTERACTIVE,
			);
		});

		it('stores a picked language as the user choice', async () => {
			jest.spyOn(listmonk, 'findSubscribers').mockResolvedValue([subscriber()]);

			const response = await putRequest({ subscribed: true, locale: 'de' });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'subscribed', locale: 'de' });
			expect(listmonk.updateSubscriber).toHaveBeenCalledWith(
				10,
				{
					attribs: {
						clerk_user_id: TEST_USER_ID,
						locale: 'de',
						locale_source: 'user',
						source: 'sync',
					},
				},
				INTERACTIVE,
			);
		});

		it('keeps a picked language when only the toggle changes', async () => {
			jest.spyOn(listmonk, 'findSubscribers').mockResolvedValue([
				subscriber({
					attribs: { clerk_user_id: TEST_USER_ID, locale: 'de', locale_source: 'user' },
				}),
			]);

			const response = await putRequest({ subscribed: false });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'unsubscribed', locale: 'de' });
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('resubscribes an existing subscriber on the explicit toggle', async () => {
			jest
				.spyOn(listmonk, 'findSubscribers')
				.mockResolvedValue([
					subscriber({ lists: [{ id: LIST_ID, subscription_status: 'unsubscribed' }] }),
				]);

			const response = await putRequest({ subscribed: true });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'subscribed', locale: 'en' });
			expect(listmonk.addToList).toHaveBeenCalledWith(10, 'confirmed', INTERACTIVE);
		});

		it('keeps an unsubscribed subscriber off the list when only the language changes', async () => {
			jest
				.spyOn(listmonk, 'findSubscribers')
				.mockResolvedValue([
					subscriber({ lists: [{ id: LIST_ID, subscription_status: 'unsubscribed' }] }),
				]);

			const response = await putRequest({ locale: 'de' });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'unsubscribed', locale: 'de' });
			expect(listmonk.addToList).not.toHaveBeenCalled();
		});

		it('unsubscribes an existing subscriber', async () => {
			jest.spyOn(listmonk, 'findSubscribers').mockResolvedValue([subscriber()]);

			const response = await putRequest({ subscribed: false });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'unsubscribed', locale: 'en' });
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, INTERACTIVE);
		});

		it('records an opt-out as an unsubscribed membership when there is no subscriber yet', async () => {
			const response = await putRequest({ subscribed: false });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'unsubscribed', locale: 'en' });
			expect(listmonk.createSubscriber).toHaveBeenCalledWith(
				expect.objectContaining({ listIds: [] }),
				INTERACTIVE,
			);
			expect(listmonk.addToList).toHaveBeenCalledWith(10, 'unsubscribed', INTERACTIVE);
		});

		it('leaves a blocklisted subscriber untouched', async () => {
			jest
				.spyOn(listmonk, 'findSubscribers')
				.mockResolvedValue([subscriber({ status: 'blocklisted' })]);

			const response = await putRequest({ subscribed: true });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'blocked', locale: null });
			expect(listmonk.addToList).not.toHaveBeenCalled();
			expect(listmonk.unsubscribeFromList).not.toHaveBeenCalled();
		});

		it('is blocked and stops mailing the old address after a move onto a blocklisted one', async () => {
			jest
				.spyOn(listmonk, 'findSubscribers')
				.mockResolvedValue([
					subscriber({ email: 'old@example.com' }),
					subscriber({ id: 11, status: 'blocklisted', attribs: {}, lists: [] }),
				]);

			const response = await putRequest({ subscribed: true });

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ status: 'blocked', locale: null });
			expect(listmonk.unsubscribeFromList).toHaveBeenCalledWith(10, INTERACTIVE);
			expect(listmonk.addToList).not.toHaveBeenCalled();
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
		});

		it('returns 409 without a write when the address belongs to another account', async () => {
			jest
				.spyOn(listmonk, 'findSubscribers')
				.mockResolvedValue([subscriber({ attribs: { clerk_user_id: 'user_other' } })]);

			const response = await putRequest({ subscribed: true });

			expect(response).toHaveStatusCode(409);
			expect(listmonk.updateSubscriber).not.toHaveBeenCalled();
			expect(listmonk.addToList).not.toHaveBeenCalled();
		});

		it('returns 400 for an account without a verified email and without a subscriber', async () => {
			jest.spyOn(container.resolve(NewsletterSyncService), 'getUser').mockResolvedValue({
				id: TEST_USER_ID,
				email: null,
				firstName: 'Jane',
				locale: 'en',
				banned: false,
			});

			const response = await putRequest({ subscribed: true });

			expect(response).toHaveStatusCode(400);
			expect(listmonk.createSubscriber).not.toHaveBeenCalled();
		});

		it('returns 503 when listmonk is not configured', async () => {
			jest.spyOn(listmonk, 'isEnabled').mockReturnValue(false);

			const response = await putRequest({ subscribed: true });

			expect(response).toHaveStatusCode(503);
		});

		it('returns 503 when listmonk fails', async () => {
			jest.spyOn(listmonk, 'findSubscribers').mockResolvedValue([subscriber()]);
			jest.spyOn(listmonk, 'unsubscribeFromList').mockRejectedValue(new ListmonkApiError(502, 'x'));

			const response = await putRequest({ subscribed: false });

			expect(response).toHaveStatusCode(503);
		});
	});
});
