import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { eq } from 'drizzle-orm';
import qs from 'qs';
import { ShortUrlAliasConflict, ShortUrlAliasErrorCode } from '@shared/schemas';
import type {
	TShortUrlWithCustomDomainPaginatedResponseDto,
	TResolveDomainResponseDto,
	TShortUrlAliasAvailabilityResponseDto,
	TShortUrlWithCustomDomainResponseDto,
} from '@shared/schemas';
import db from '@/core/db';
import { API_BASE_PATH } from '@/core/config/constants';
import { customDomain } from '@/core/db/schemas';
import { resetTestState } from '@/tests/shared/test-context';
import { generateCreateCustomDomainDto } from '@/tests/shared/factories/custom-domain.factory';
import { generateShortUrlDto } from '@/tests/shared/factories/short-url.factory';
import {
	CUSTOM_DOMAIN_API_PATH,
	createCustomDomainDirectly,
	getTestContext,
	TEST_USER_2_ID,
	TEST_USER_PRO_ID,
	type TestContext,
} from '@/modules/custom-domain/http/__tests__/utils';
import ShortUrlRepository from '../../domain/repository/short-url.repository';
import { SHORT_URL_API_PATH } from './utils';

const VERIFIED = {
	sslStatus: 'active',
	ownershipStatus: 'verified',
	isEnabled: true,
	cnameVerified: true,
	ownershipTxtVerified: true,
} as const;

describe('short URL alias', () => {
	let ctx: TestContext;
	let testServer: FastifyInstance;
	let tokenPro: string;
	let token2: string;
	let domainId: string;
	let domainName: string;
	let otherDomainId: string;

	/** Every test gets its own alias, so the tests do not depend on their order. */
	let counter = 0;
	const uniqueAlias = (prefix = 'menu') => `${prefix}-${Date.now().toString(36)}-${counter++}`;

	/** Straight into the database: the API only lets an account create a few links a minute. */
	const createLink = async (
		userId = TEST_USER_PRO_ID,
		customDomainId: string | null = domainId,
	) => {
		const repository = container.resolve(ShortUrlRepository);
		const id = repository.generateId();
		const shortCode = await repository.generateShortCode();
		await repository.create({
			id,
			shortCode,
			name: null,
			destinationUrl: generateShortUrlDto().destinationUrl,
			qrCodeId: null,
			customDomainId,
			isActive: true,
			createdBy: userId,
			deletedAt: null,
		});
		return { id, shortCode };
	};

	const setAlias = (shortCode: string, alias: string | null, token = tokenPro) =>
		testServer.inject({
			method: 'PUT',
			url: `${SHORT_URL_API_PATH}/${shortCode}/alias`,
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
			payload: { alias },
		});

	const availability = (alias: string, customDomainId = domainId, token = tokenPro) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/alias-availability?customDomainId=${customDomainId}&alias=${encodeURIComponent(alias)}`,
			headers: { Authorization: `Bearer ${token}` },
		});

	/** The call of the custom domain worker: public, no token. */
	const resolveAlias = (alias: string, domain = domainName) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/resolve-alias?domain=${encodeURIComponent(domain)}&alias=${encodeURIComponent(alias)}`,
		});

	const getDetail = async (shortCode: string, token = tokenPro) => {
		const response = await testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortCode}/detail`,
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(response).toHaveStatusCode(200);
		return JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
	};

	const errorCodeOf = (payload: string) =>
		(JSON.parse(payload) as { errorCode?: string }).errorCode;

	beforeAll(async () => {
		await resetTestState();
		ctx = await getTestContext();
		testServer = ctx.testServer;
		tokenPro = ctx.accessTokenPro;
		token2 = ctx.accessToken2;

		domainName = generateCreateCustomDomainDto().domain.toLowerCase();
		domainId = await createCustomDomainDirectly(ctx, domainName, TEST_USER_PRO_ID, VERIFIED);
		otherDomainId = await createCustomDomainDirectly(
			ctx,
			generateCreateCustomDomainDto().domain.toLowerCase(),
			TEST_USER_2_ID,
			VERIFIED,
		);
	});

	describe('PUT /short-url/:shortCode/alias', () => {
		it('gives a short URL on a custom domain its alias', async () => {
			const link = await createLink();
			const alias = uniqueAlias();

			const response = await setAlias(link.shortCode, alias);

			expect(response).toHaveStatusCode(200);
			const updated = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
			expect(updated.alias).toBe(alias);
			expect(updated.shortCode).toBe(link.shortCode);
			expect((await getDetail(link.shortCode)).alias).toBe(alias);
		});

		it('stores an alias typed in upper case in lower case', async () => {
			const link = await createLink();
			const alias = uniqueAlias('sommerfest');

			const response = await setAlias(link.shortCode, alias.toUpperCase());

			expect(response).toHaveStatusCode(200);
			expect((await getDetail(link.shortCode)).alias).toBe(alias);
		});

		it.each(['ab', '-menu', 'menu-', 'me--nu', 'menü', 'me nu', 'a'.repeat(81)])(
			'refuses the malformed alias %p',
			async (alias) => {
				const link = await createLink();

				const response = await setAlias(link.shortCode, alias);

				expect(response).toHaveStatusCode(400);
			},
		);

		it('refuses an alias for a short URL on the system domain', async () => {
			const link = await createLink(TEST_USER_PRO_ID, null);

			const response = await setAlias(link.shortCode, uniqueAlias());

			expect(response).toHaveStatusCode(400);
			expect(errorCodeOf(response.payload)).toBe(ShortUrlAliasErrorCode.REQUIRES_CUSTOM_DOMAIN);
		});

		it('refuses an alias another short URL already has on the same domain', async () => {
			const alias = uniqueAlias();
			const first = await createLink();
			const second = await createLink();
			await setAlias(first.shortCode, alias);

			const response = await setAlias(second.shortCode, alias);

			expect(response).toHaveStatusCode(409);
			expect(errorCodeOf(response.payload)).toBe(ShortUrlAliasErrorCode.TAKEN);
			expect((await getDetail(second.shortCode)).alias).toBeNull();
		});

		it('allows the same alias on the custom domain of another account', async () => {
			const alias = uniqueAlias();
			const mine = await createLink();
			const theirs = await createLink(TEST_USER_2_ID, otherDomainId);
			await setAlias(mine.shortCode, alias);

			const response = await setAlias(theirs.shortCode, alias, token2);

			expect(response).toHaveStatusCode(200);
		});

		it('refuses an alias that is the short code of some short URL', async () => {
			const link = await createLink();
			const other = await createLink(TEST_USER_2_ID, null);

			const response = await setAlias(link.shortCode, other.shortCode);

			expect(response).toHaveStatusCode(409);
			expect(errorCodeOf(response.payload)).toBe(ShortUrlAliasErrorCode.MATCHES_SHORT_CODE);
		});

		it('replaces the alias and frees the previous one at once', async () => {
			const before = uniqueAlias('before');
			const after = uniqueAlias('after');
			const link = await createLink();
			await setAlias(link.shortCode, before);

			const response = await setAlias(link.shortCode, after);

			expect(response).toHaveStatusCode(200);
			expect(await resolveAlias(before)).toHaveStatusCode(404);
			expect(await resolveAlias(after)).toHaveStatusCode(200);
			const next = await createLink();
			expect(await setAlias(next.shortCode, before)).toHaveStatusCode(200);
		});

		it('accepts the alias the short URL already has', async () => {
			const alias = uniqueAlias();
			const link = await createLink();
			await setAlias(link.shortCode, alias);

			const response = await setAlias(link.shortCode, alias);

			expect(response).toHaveStatusCode(200);
		});

		it('refuses to change the short URL of another account', async () => {
			const link = await createLink();

			const response = await setAlias(link.shortCode, uniqueAlias(), token2);

			expect(response).toHaveStatusCode(403);
		});

		it('needs a session', async () => {
			const link = await createLink();

			const response = await testServer.inject({
				method: 'PUT',
				url: `${SHORT_URL_API_PATH}/${link.shortCode}/alias`,
				headers: { 'Content-Type': 'application/json' },
				payload: { alias: uniqueAlias() },
			});

			expect(response).toHaveStatusCode(401);
		});
	});

	describe('PUT /short-url/:shortCode/alias with null', () => {
		it('removes the alias, keeps the short URL and frees the alias', async () => {
			const alias = uniqueAlias();
			const link = await createLink();
			await setAlias(link.shortCode, alias);

			const response = await setAlias(link.shortCode, null);

			expect(response).toHaveStatusCode(200);
			expect(
				(JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto).alias,
			).toBeNull();
			expect(await resolveAlias(alias)).toHaveStatusCode(404);
			expect((await getDetail(link.shortCode)).shortCode).toBe(link.shortCode);
			const next = await createLink();
			expect(await setAlias(next.shortCode, alias)).toHaveStatusCode(200);
		});

		it('answers the same for a short URL without an alias', async () => {
			const link = await createLink();

			const response = await setAlias(link.shortCode, null);

			expect(response).toHaveStatusCode(200);
		});
	});

	describe('POST /short-url with an alias', () => {
		const create = (payload: object, token = tokenPro) =>
			testServer.inject({
				method: 'POST',
				url: SHORT_URL_API_PATH,
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				payload,
			});

		it('creates the short URL with its alias', async () => {
			const alias = uniqueAlias();

			const response = await create(generateShortUrlDto({ customDomainId: domainId, alias }));

			expect(response).toHaveStatusCode(201);
			const created = JSON.parse(response.payload) as TShortUrlWithCustomDomainResponseDto;
			expect(created.alias).toBe(alias);
			expect(await resolveAlias(alias)).toHaveStatusCode(200);
		});

		it('refuses an alias without a custom domain', async () => {
			const response = await create(generateShortUrlDto({ alias: uniqueAlias() }));

			expect(response).toHaveStatusCode(400);
			expect(errorCodeOf(response.payload)).toBe(ShortUrlAliasErrorCode.REQUIRES_CUSTOM_DOMAIN);
		});

		it('creates nothing when the alias is taken', async () => {
			const alias = uniqueAlias();
			const holder = await createLink();
			await setAlias(holder.shortCode, alias);
			const dto = generateShortUrlDto({ customDomainId: domainId, alias });

			const response = await create(dto);

			expect(response).toHaveStatusCode(409);
			expect(errorCodeOf(response.payload)).toBe(ShortUrlAliasErrorCode.TAKEN);
			const [created] = await db.query.shortUrl.findMany({
				where: (shortUrl, { eq: equals }) => equals(shortUrl.destinationUrl, dto.destinationUrl),
			});
			expect(created).toBeUndefined();
		});
	});

	describe('GET /short-url/alias-availability', () => {
		it('says a free alias is available', async () => {
			const response = await availability(uniqueAlias());

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual<TShortUrlAliasAvailabilityResponseDto>({
				available: true,
				conflict: null,
			});
		});

		it('says why an alias in use on the domain is not available', async () => {
			const alias = uniqueAlias();
			const link = await createLink();
			await setAlias(link.shortCode, alias);

			const response = await availability(alias);

			expect(JSON.parse(response.payload)).toEqual<TShortUrlAliasAvailabilityResponseDto>({
				available: false,
				conflict: ShortUrlAliasConflict.TAKEN,
			});
		});

		it('says an alias that is a short code is not available', async () => {
			const link = await createLink(TEST_USER_PRO_ID, null);

			const response = await availability(link.shortCode);

			expect(JSON.parse(response.payload)).toEqual<TShortUrlAliasAvailabilityResponseDto>({
				available: false,
				conflict: ShortUrlAliasConflict.MATCHES_SHORT_CODE,
			});
		});

		it('does not answer for the custom domain of another account', async () => {
			const response = await availability(uniqueAlias(), otherDomainId);

			expect(response).toHaveStatusCode(403);
		});

		it('refuses a malformed alias', async () => {
			const response = await availability('-menu');

			expect(response).toHaveStatusCode(400);
		});
	});

	describe('GET /short-url/resolve-alias (custom domain worker)', () => {
		it('translates an alias into its short code, without a token', async () => {
			const alias = uniqueAlias();
			const link = await createLink();
			await setAlias(link.shortCode, alias);

			const response = await resolveAlias(alias);

			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ shortCode: link.shortCode });
		});

		it('finds the alias when it is typed in upper case', async () => {
			const alias = uniqueAlias();
			const link = await createLink();
			await setAlias(link.shortCode, alias);

			const response = await resolveAlias(alias.toUpperCase());

			expect(JSON.parse(response.payload)).toEqual({ shortCode: link.shortCode });
		});

		it('does not find the alias on another domain', async () => {
			const alias = uniqueAlias();
			const link = await createLink();
			await setAlias(link.shortCode, alias);

			expect(await resolveAlias(alias, 'unknown.example.com')).toHaveStatusCode(404);
		});

		it('does not find an alias nobody has', async () => {
			expect(await resolveAlias(uniqueAlias())).toHaveStatusCode(404);
		});

		it('does not treat a short code as an alias', async () => {
			const link = await createLink();

			expect(await resolveAlias(link.shortCode)).toHaveStatusCode(404);
		});
	});

	describe('GET /custom-domain/resolve', () => {
		const resolveDomain = async (domain: string) => {
			const response = await testServer.inject({
				method: 'GET',
				url: `${CUSTOM_DOMAIN_API_PATH}/resolve?domain=${encodeURIComponent(domain)}`,
			});
			return JSON.parse(response.payload) as TResolveDomainResponseDto;
		};

		it('tells the worker whether a domain has aliases at all', async () => {
			const name = generateCreateCustomDomainDto().domain.toLowerCase();
			const id = await createCustomDomainDirectly(ctx, name, TEST_USER_PRO_ID, VERIFIED);
			const link = await createLink(TEST_USER_PRO_ID, id);

			expect((await resolveDomain(name)).hasAliases).toBe(false);

			await setAlias(link.shortCode, uniqueAlias());

			expect((await resolveDomain(name)).hasAliases).toBe(true);
		});
	});

	describe('GET /short-url search', () => {
		/** The dashboard searches short code, alias and destination with one term. */
		const search = async (term: string) => {
			const where = {
				shortCode: { like: term },
				alias: { like: term },
				destinationUrl: { like: term },
			};
			const response = await testServer.inject({
				method: 'GET',
				url: `${SHORT_URL_API_PATH}?${qs.stringify({ standalone: true, where })}`,
				headers: { Authorization: `Bearer ${tokenPro}` },
			});
			expect(response).toHaveStatusCode(200);
			const page = JSON.parse(response.payload) as TShortUrlWithCustomDomainPaginatedResponseDto;
			return page.data.map((shortUrl) => shortUrl.shortCode);
		};

		it('finds a short URL by its alias, and by a part of it', async () => {
			const alias = uniqueAlias('findme');
			const link = await createLink();
			await createLink();
			await setAlias(link.shortCode, alias);

			expect(await search(alias)).toEqual([link.shortCode]);
			expect(await search(alias.replace('findme-', ''))).toEqual([link.shortCode]);
		});

		it('does not find the alias of another account', async () => {
			const alias = uniqueAlias('theirs');
			const theirs = await createLink(TEST_USER_2_ID, otherDomainId);
			expect(await setAlias(theirs.shortCode, alias, token2)).toHaveStatusCode(200);

			expect(await search(alias)).toEqual([]);
		});
	});

	describe('API docs', () => {
		it('documents setting and checking an alias, but not the route of the worker', async () => {
			const response = await testServer.inject({
				method: 'GET',
				url: `${API_BASE_PATH}/openapi.json`,
			});
			const { paths } = JSON.parse(response.payload) as { paths: Record<string, unknown> };
			const documented = Object.keys(paths).filter((path) => path.includes('alias'));

			expect(documented.map((path) => path.replace(/^.*\/short-url/, ''))).toEqual(
				expect.arrayContaining(['/{shortCode}/alias', '/alias-availability']),
			);
			expect(documented.filter((path) => path.includes('resolve-alias'))).toEqual([]);
		});
	});

	describe('when the short URL or its domain goes away', () => {
		it('frees the alias when the short URL is deleted', async () => {
			const alias = uniqueAlias();
			const link = await createLink();
			await setAlias(link.shortCode, alias);

			const deleted = await testServer.inject({
				method: 'DELETE',
				url: `${SHORT_URL_API_PATH}/${link.shortCode}`,
				headers: { Authorization: `Bearer ${tokenPro}` },
			});

			expect(deleted).toHaveStatusCode(200);
			expect(await resolveAlias(alias)).toHaveStatusCode(404);
			const next = await createLink();
			expect(await setAlias(next.shortCode, alias)).toHaveStatusCode(200);
		});

		it('clears the alias of a short URL that lost its custom domain', async () => {
			const name = generateCreateCustomDomainDto().domain.toLowerCase();
			const id = await createCustomDomainDirectly(ctx, name, TEST_USER_PRO_ID, VERIFIED);
			const link = await createLink(TEST_USER_PRO_ID, id);
			await setAlias(link.shortCode, uniqueAlias());

			await db.delete(customDomain).where(eq(customDomain.id, id));
			await container.resolve(ShortUrlRepository).clearAliasesWithoutDomain();

			const detail = await getDetail(link.shortCode);
			expect(detail.customDomain).toBeNull();
			expect(detail.alias).toBeNull();
		});
	});

	describe('short codes', () => {
		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('never hands out a short code that is an alias somewhere', async () => {
			const repository = container.resolve(ShortUrlRepository);
			// 0 picks "a" and 0.03 picks "b" from the code alphabet
			const taken = 'aaaaa';
			const link = await createLink();
			if (!(await repository.findOneByShortCode(taken))) {
				expect(await setAlias(link.shortCode, taken)).toHaveStatusCode(200);
			}
			const random = jest.spyOn(Math, 'random');
			for (let i = 0; i < 5; i++) random.mockReturnValueOnce(0);
			random.mockReturnValue(0.03);

			const shortCode = await repository.generateShortCode();

			expect(shortCode).not.toBe(taken);
		});
	});
});
