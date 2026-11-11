import type { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { container } from 'tsyringe';
import { faker } from '@faker-js/faker';
import type {
	THostedPageContent,
	THostedUsage,
	THostedPageUsageResponseDto,
	THostedUploadResponseDto,
	TPublicHostedPageResponseDto,
	TQrCodeWithRelationsResponseDto,
	TCreateQrCodeDto,
} from '@shared/schemas';
import { HOSTED_FILE_KEY_MASK, QrCodeDefaults } from '@shared/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import { env } from '@/core/config/env';
import { HOSTED_PAGE_PLAN_LIMITS } from '@/core/config/plan.config';
import { resetTestState, TEST_USER_2_ID, TEST_USER_PRO_ID } from '@/tests/shared/test-context';
import {
	getTestContext as getBillingTestContext,
	createSubscriptionDirectly,
	cleanupCreatedSubscriptions,
	cleanupSubscriptionsForUser,
	type TestContext as BillingTestContext,
} from '@/modules/billing/http/__tests__/utils';
import { DisableProFeaturesUseCase } from '@/modules/billing/useCase/disable-pro-features.use-case';
import { EnableProFeaturesUseCase } from '@/modules/billing/useCase/enable-pro-features.use-case';
import UserSubscriptionRepository from '@/modules/billing/domain/repository/user-subscription.repository';
import StoredFileRepository from '@/modules/stored-file/domain/repository/stored-file.repository';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import HostedPageRepository from '../../domain/repository/hosted-page.repository';
import { PurgeDeletedHostedPagesCronJob } from '../../jobs/purge-deleted-hosted-pages.cron-job';
import { GetReservedShortCodeUseCase } from '@/modules/url-shortener/useCase/get-reserved-short-url.use-case';
import qrCodeTable from '@/modules/qr-code/domain/entities/qr-code.entity';
import { HostedFileService } from '../../service/hosted-file.service';
import { ObjectStorage } from '@/core/storage';
import { HostedPageService } from '../../service/hosted-page.service';
import { MalwareScanService } from '@/modules/stored-file/service/malware-scan.service';
import { FileRejectedError } from '@/modules/stored-file/error/http/file-rejected.error';
import QrCodeRepository from '@/modules/qr-code/domain/repository/qr-code.repository';
import { UnitOfWork } from '@/core/db/unit-of-work';
import { HostedPageLimitPolicy } from '../../policies/hosted-page-limit.policy';
import { createQrCodeRequest, getTestContext } from '@/modules/qr-code/http/__tests__/utils';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import { DestinationUrlSafetyService } from '@/modules/url-shortener/service/destination-url-safety.service';
import { BadRequestError } from '@/core/error/http';
import db from '@/core/db';
import { eq, like } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import storedFile from '@/modules/stored-file/domain/entities/stored-file.entity';
import {
	HOSTED_UPLOAD_HARD_LIMIT_BYTES,
	HOSTED_UPLOAD_MAX_UNCLAIMED,
} from '@/modules/hosted-page/config/constants';
import shortUrl from '@/modules/url-shortener/domain/entities/short-url.entity';
import {
	createCustomDomainDirectly,
	deleteCustomDomainDirectly,
	getTestContext as getDomainTestContext,
} from '@/modules/custom-domain/http/__tests__/utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;
const HOSTED_API_PATH = `${API_BASE_PATH}/hosted-page`;
const SHORT_URL_API_PATH = `${API_BASE_PATH}/short-url`;

const MINIMAL_PDF = Buffer.from(
	'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);
const PDF_WITH_OPEN_ACTION = Buffer.from(
	'%PDF-1.4\n1 0 obj<</Type/Catalog/OpenAction<</S/JavaScript/JS(app.alert(1))>>>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);
const MINIMAL_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64',
);

/**
 * Hosted pages are Pro-only. `accessTokenPro` and `accessToken2` are Pro here (their
 * subscriptions exist before the first request, so the plan cache never sees them as free);
 * `accessToken` stays on the free plan for the gating tests.
 */
describe('Hosted pages', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessToken2: string;
	let accessTokenPro: string;
	let billingCtx: BillingTestContext;

	const uploadRequest = (
		kind: string,
		content: Buffer,
		token?: string,
		filename = 'brochure.pdf',
		contentType = 'application/pdf',
	) => {
		const formData = new FormData();
		formData.append('kind', kind);
		formData.append('file', content, { filename, contentType });
		return testServer.inject({
			method: 'POST',
			url: `${HOSTED_API_PATH}/upload`,
			payload: formData,
			headers: {
				...(token && { Authorization: `Bearer ${token}` }),
				...formData.getHeaders(),
			},
		});
	};

	const uploadPdf = async (token: string, content = MINIMAL_PDF) => {
		const response = await uploadRequest('pdf', content, token);
		expect(response).toHaveStatusCode(201);
		return JSON.parse(response.payload) as THostedUploadResponseDto;
	};

	const pdfDto = (upload: THostedUploadResponseDto, extra: Record<string, unknown> = {}) =>
		({
			name: faker.lorem.words(2),
			config: QrCodeDefaults,
			content: {
				type: 'pdf',
				data: {
					title: 'Speisekarte',
					description: 'Unsere aktuelle Karte',
					documents: [
						{
							title: 'Speisekarte',
							fileKey: upload.fileKey,
							fileName: upload.fileName,
							fileSize: upload.fileSize,
						},
					],
					...extra,
				},
			},
		}) as unknown as TCreateQrCodeDto;

	const pageIdOf = async (qrCode: TQrCodeWithRelationsResponseDto) =>
		(await container.resolve(ShortUrlRepository).findOneByShortCode(qrCode.shortUrl!.shortCode))
			?.hostedPageId;

	const firstKey = (qrCode: TQrCodeWithRelationsResponseDto) =>
		qrCode.content.type === 'pdf' ? qrCode.content.data.documents[0].fileKey : '';

	const deleteQrCode = (id: string, token: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${QR_CODE_API_PATH}/${id}`,
			headers: { Authorization: `Bearer ${token}` },
		});

	// every test removes its codes again: the pro plan only holds a handful of pages
	const createdCodes: { id: string; token: string }[] = [];
	const createCode = async (dto: TCreateQrCodeDto, token?: string) => {
		const response = await createQrCodeRequest(testServer, dto, token);
		if (response.statusCode === 201 && token) {
			createdCodes.push({ id: (JSON.parse(response.payload) as { id: string }).id, token });
		}
		return response;
	};

	const createPdfCode = async (token: string, extra: Record<string, unknown> = {}) => {
		const upload = await uploadPdf(token);
		const response = await createCode(pdfDto(upload, extra), token);
		expect(response).toHaveStatusCode(201);
		return JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
	};

	const getPage = (shortCode: string) =>
		testServer.inject({ method: 'GET', url: `${HOSTED_API_PATH}/by-code/${shortCode}` });

	/** Host of the page's one address, which the frontend forwards with every file request. */
	const pageHostOf = async (shortCode: string) => {
		const link = await container.resolve(ShortUrlRepository).findOneByShortCode(shortCode);
		return new URL(buildShortUrl(shortCode, link?.customDomain?.domain ?? null)).host;
	};

	const fileRequest = async (
		shortCode: string,
		query = '',
		headers: Record<string, string> = {},
		method: 'GET' | 'HEAD' = 'GET',
	) => {
		const params = new URLSearchParams(query.replace(/^\?/, ''));
		let documentId = params.get('document');
		params.delete('document');
		if (!documentId) {
			const page = await getPage(shortCode);
			documentId =
				page.statusCode === 200
					? ((JSON.parse(page.payload) as { documents?: { id: string }[] }).documents?.[0]?.id ??
						'none')
					: 'none';
		}
		const search = params.toString();
		return testServer.inject({
			method,
			url: `${HOSTED_API_PATH}/by-code/${shortCode}/files/${documentId}${search ? `?${search}` : ''}`,
			headers: {
				'x-internal-api-key': env.INTERNAL_API_SECRET,
				'x-hosted-host': await pageHostOf(shortCode),
				...headers,
			},
		});
	};

	const getFile = (shortCode: string, query = '', headers: Record<string, string> = {}) =>
		fileRequest(shortCode, query, headers);

	const internalLookup = (shortCode: string) =>
		testServer.inject({
			method: 'GET',
			url: `${SHORT_URL_API_PATH}/${shortCode}`,
			headers: { 'x-internal-api-key': env.INTERNAL_API_SECRET },
		});

	const authJson = (token: string) => ({
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
	});

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessToken2 = ctx.accessToken2;
		accessTokenPro = ctx.accessTokenPro;
		billingCtx = await getBillingTestContext();
		await createSubscriptionDirectly(billingCtx, TEST_USER_PRO_ID);
		await createSubscriptionDirectly(billingCtx, TEST_USER_2_ID);
	});

	afterEach(async () => {
		for (const code of createdCodes.splice(0)) await deleteQrCode(code.id, code.token);
	});

	afterAll(async () => {
		await cleanupCreatedSubscriptions(billingCtx);
		await cleanupSubscriptionsForUser(TEST_USER_2_ID);
	});

	describe('POST /hosted-page/upload', () => {
		it('refuses an anonymous or oversized upload through the guard', async () => {
			expect(await uploadRequest('pdf', MINIMAL_PDF)).toHaveStatusCode(401);

			const oversized = await testServer.inject({
				method: 'POST',
				url: `${HOSTED_API_PATH}/upload`,
				payload: 'x',
				headers: {
					Authorization: `Bearer ${accessTokenPro}`,
					'content-type': 'multipart/form-data; boundary=x',
					'content-length': String(HOSTED_UPLOAD_HARD_LIMIT_BYTES * 2),
				},
			});
			expect(oversized).toHaveStatusCode(413);
		});

		it('stores a PDF under the user prefix and detects the type from its bytes', async () => {
			const response = await uploadRequest(
				'pdf',
				MINIMAL_PDF,
				accessTokenPro,
				'Karte 2026.pdf',
				'text/plain',
			);
			expect(response).toHaveStatusCode(201);
			const upload = JSON.parse(response.payload) as THostedUploadResponseDto;
			// the owner segment is a hash, so storage keys never reveal a user id
			expect(upload.fileKey).toMatch(/^hosted-pages\/[0-9a-f]{32}\/[0-9a-f-]+\.pdf$/);
			expect(upload.fileKey).not.toContain(TEST_USER_PRO_ID);
			expect(upload.contentType).toBe('application/pdf');
			expect(upload.fileName).toBe('Karte 2026.pdf');
			expect(upload.fileSize).toBe(MINIMAL_PDF.length);
			// PDFs are only ever served through the page, never by a direct storage URL
			expect(upload.url).toBeNull();
			// ...and they live in the bucket without public access, not behind the CDN
			const storage = container.resolve(ObjectStorage);
			expect(await storage.private.get(upload.fileKey)).not.toBeNull();
			await expect(storage.public.get(upload.fileKey)).rejects.toThrow();

			const row = await container.resolve(StoredFileRepository).findByFileKey(upload.fileKey);
			expect(row?.claimedAt).toBeNull();
			expect(row?.ownerId).toBeNull();
		});

		it('stores a PNG as image upload', async () => {
			const response = await uploadRequest(
				'image',
				MINIMAL_PNG,
				accessTokenPro,
				'me.png',
				'image/png',
			);
			expect(response).toHaveStatusCode(201);
			const upload = JSON.parse(response.payload) as THostedUploadResponseDto;
			expect(upload.contentType).toBe('image/png');
			expect(upload.fileKey).toMatch(/\.png$/);
		});

		it('accepts a real image whose bytes happen to contain "<%"', async () => {
			const noisyPng = Buffer.concat([MINIMAL_PNG, Buffer.from('xx<%yy')]);
			const response = await uploadRequest(
				'image',
				noisyPng,
				accessTokenPro,
				'photo.png',
				'image/png',
			);
			expect(response).toHaveStatusCode(201);
		});

		it('rejects a file that only claims to be a PDF', async () => {
			const response = await uploadRequest('pdf', Buffer.from('hello world'), accessTokenPro);
			expect(response).toHaveStatusCode(400);
			expect(JSON.parse(response.payload).errorCode).toBe('HOSTED_FILE_TYPE_NOT_SUPPORTED');
		});

		it('accepts ordinary PDF features such as an open action: only malware is refused', async () => {
			const response = await uploadRequest('pdf', PDF_WITH_OPEN_ACTION, accessTokenPro);
			expect(response).toHaveStatusCode(201);
		});

		it('scans every uploaded file for malware, whatever its kind', async () => {
			const scan = jest.spyOn(container.resolve(MalwareScanService), 'assertClean');
			try {
				await uploadPdf(accessTokenPro);
				const image = await uploadRequest(
					'image',
					MINIMAL_PNG,
					accessTokenPro,
					'cover.png',
					'image/png',
				);
				expect(image).toHaveStatusCode(201);
				expect(scan.mock.calls.map(([, context]) => context.kind)).toEqual(['pdf', 'image']);
			} finally {
				scan.mockRestore();
			}
		});

		it('refuses a file the virus scanner reports', async () => {
			const scan = jest
				.spyOn(container.resolve(MalwareScanService), 'assertClean')
				.mockRejectedValueOnce(new FileRejectedError());
			try {
				const response = await uploadRequest('pdf', MINIMAL_PDF, accessTokenPro);
				expect(response).toHaveStatusCode(400);
				expect(JSON.parse(response.payload).errorCode).toBe('FILE_REJECTED');
			} finally {
				scan.mockRestore();
			}
		});

		it('rejects an image above the plan limit', async () => {
			const tooLarge = Buffer.concat([
				MINIMAL_PNG,
				Buffer.alloc(HOSTED_PAGE_PLAN_LIMITS.pro.maxFileSizeBytes.image, 0x20),
			]);
			const response = await uploadRequest(
				'image',
				tooLarge,
				accessTokenPro,
				'big.png',
				'image/png',
			);
			expect(response).toHaveStatusCode(403);
			expect(JSON.parse(response.payload).errorCode).toBe('HOSTED_FILE_TOO_LARGE');
		});

		it('is a Pro feature: the free plan cannot upload', async () => {
			const response = await uploadRequest('pdf', MINIMAL_PDF, accessToken);
			expect(response).toHaveStatusCode(403);
			expect(JSON.parse(response.payload).message).toContain('upgrade');
		});

		it('keeps no record of an upload that never reached storage', async () => {
			const files = () =>
				db
					.select({ id: storedFile.id })
					.from(storedFile)
					.where(eq(storedFile.userId, TEST_USER_PRO_ID));
			const before = (await files()).length;
			let rowDuringUpload: unknown;
			const failing = jest
				.spyOn(container.resolve(HostedFileService), 'upload')
				.mockImplementationOnce(async ({ fileKey }) => {
					// the row must exist before the object, or a crash in between hides the object
					rowDuringUpload = await container.resolve(StoredFileRepository).findByFileKey(fileKey);
					throw new Error('storage down');
				});
			try {
				const response = await uploadRequest('pdf', MINIMAL_PDF, accessTokenPro);
				expect(response.statusCode).toBeGreaterThanOrEqual(500);
				expect(rowDuringUpload).toBeDefined();
				expect((await files()).length).toBe(before);
			} finally {
				failing.mockRestore();
			}
		});

		it("gives the owner the URLs of their own images only, never of documents or others' files", async () => {
			const upload = (token: string) =>
				uploadRequest('image', MINIMAL_PNG, token, 'cover.png', 'image/png').then(
					(response) => JSON.parse(response.payload) as THostedUploadResponseDto,
				);
			const ownImage = await upload(accessTokenPro);
			const ownDocument = await uploadPdf(accessTokenPro);
			const foreignImage = await upload(accessToken2);
			const keys = [ownImage.fileKey, ownDocument.fileKey, foreignImage.fileKey].join(',');

			const response = await testServer.inject({
				method: 'GET',
				url: `${HOSTED_API_PATH}/assets?keys=${encodeURIComponent(keys)}`,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
			});
			expect(response).toHaveStatusCode(200);
			expect(JSON.parse(response.payload)).toEqual({ [ownImage.fileKey]: ownImage.url });
		});

		it('requires authentication', async () => {
			const response = await uploadRequest('pdf', MINIMAL_PDF);
			expect(response).toHaveStatusCode(401);
		});
		it('always ends the file name with the extension of the stored type', async () => {
			const noExtension = await uploadRequest('pdf', MINIMAL_PDF, accessTokenPro, 'Speisekarte');
			expect(JSON.parse(noExtension.payload).fileName).toBe('Speisekarte.pdf');

			const wrongExtension = await uploadRequest('pdf', MINIMAL_PDF, accessTokenPro, 'karte.html');
			expect(JSON.parse(wrongExtension.payload).fileName).toBe('karte.pdf');
		});

		it('stops uploads once too many files wait unused for a page', async () => {
			const marker = `hosted-pages/pending-cap-${faker.string.alphanumeric(8)}`;
			await db.insert(storedFile).values(
				Array.from({ length: HOSTED_UPLOAD_MAX_UNCLAIMED }, (_, i) => ({
					id: randomUUID(),
					userId: TEST_USER_2_ID,
					ownerType: null,
					ownerId: null,
					kind: 'pdf' as const,
					visibility: 'private' as const,
					fileKey: `${marker}/${i}.pdf`,
					fileName: `${i}.pdf`,
					fileSize: 1,
					contentType: 'application/pdf',
					createdAt: new Date(),
				})),
			);
			try {
				const response = await uploadRequest('pdf', MINIMAL_PDF, accessToken2);
				expect(response).toHaveStatusCode(429);
				// the editor gives up at once on this one instead of waiting as for a busy server
				expect(response.json().errorCode).toBe('HOSTED_TOO_MANY_PENDING_UPLOADS');
			} finally {
				await db.delete(storedFile).where(like(storedFile.fileKey, `${marker}/%`));
			}
		});
	});

	describe('PDF QR codes', () => {
		it('creates a dynamic PDF code with a short URL and claims the upload', async () => {
			const upload = await uploadPdf(accessTokenPro);
			const response = await createCode(pdfDto(upload), accessTokenPro);
			expect(response).toHaveStatusCode(201);

			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(qrCode.content.type).toBe('pdf');
			expect(qrCode.shortUrl?.isActive).toBe(true);
			// a page link has no destination: the short URL serves its page
			expect(qrCode.shortUrl?.destinationUrl).toBeNull();
			expect(qrCode.qrCodeData).toContain(`/u/${qrCode.shortUrl?.shortCode}`);

			const pageId = await pageIdOf(qrCode);
			const page = await container.resolve(HostedPageRepository).findLiveById(pageId!);
			expect(page?.createdBy).toBe(TEST_USER_PRO_ID);
			expect(page?.data.title).toBe('Speisekarte');
			// the QR code row stores only its type; the page exists exactly once
			const [row] = await db.select().from(qrCodeTable).where(eq(qrCodeTable.id, qrCode.id));
			expect(row?.content).toEqual({ type: 'pdf', data: {} });

			const file = await container.resolve(StoredFileRepository).findByFileKey(upload.fileKey);
			expect(file?.ownerType).toBe('hosted_page');
			expect(file?.ownerId).toBe(pageId);
			expect(file?.claimedAt).not.toBeNull();
		});

		it('takes file name and size from the upload, not from the client', async () => {
			const upload = await uploadPdf(accessTokenPro);
			const response = await createCode(
				pdfDto(upload, {
					documents: [{ fileKey: upload.fileKey, fileName: 'spoofed.pdf', fileSize: 1 }],
				}),
				accessTokenPro,
			);
			expect(response).toHaveStatusCode(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			if (qrCode.content.type === 'pdf') {
				expect(qrCode.content.data.documents[0].fileName).toBe(upload.fileName);
				expect(qrCode.content.data.documents[0].fileSize).toBe(upload.fileSize);
			}
		});

		it('refuses a file key owned by another user', async () => {
			const foreignUpload = await uploadPdf(accessToken2);
			const response = await createCode(pdfDto(foreignUpload), accessTokenPro);
			expect(response).toHaveStatusCode(403);
		});

		it('refuses an unknown file key', async () => {
			const upload = await uploadPdf(accessTokenPro);
			const unknownKey = upload.fileKey.replace(/[0-9a-f-]+\.pdf$/, 'does-not-exist.pdf');
			const response = await createCode(pdfDto({ ...upload, fileKey: unknownKey }), accessTokenPro);
			expect(response).toHaveStatusCode(400);
			expect(JSON.parse(response.payload).errorCode).toBe('HOSTED_UPLOAD_NOT_FOUND');
		});

		it('requires a login because hosted pages are dynamic', async () => {
			const upload = await uploadPdf(accessTokenPro);
			const response = await createCode(pdfDto(upload));
			expect(response).toHaveStatusCode(401);
		});

		it('swaps the file on update: the document keeps its id, the old file waits for its purge date', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const oldKey = firstKey(qrCode);
			const documentId =
				qrCode.content.type === 'pdf' ? qrCode.content.data.documents[0]?.id : undefined;
			expect(documentId).toBeTruthy();
			const replacement = await uploadPdf(accessTokenPro);

			const response = await testServer.inject({
				method: 'PATCH',
				url: `${QR_CODE_API_PATH}/${qrCode.id}`,
				payload: {
					content: {
						type: 'pdf',
						data: {
							title: 'Neue Karte',
							documents: [
								{
									id: documentId,
									fileKey: replacement.fileKey,
									fileName: replacement.fileName,
									fileSize: replacement.fileSize,
								},
							],
						},
					},
				},
				headers: authJson(accessTokenPro),
			});
			expect(response).toHaveStatusCode(200);
			const updated = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
			expect(
				updated.content.type === 'pdf' ? updated.content.data.documents[0]?.id : undefined,
			).toBe(documentId);

			const repo = container.resolve(StoredFileRepository);
			const released = await repo.findByFileKey(oldKey);
			expect(released?.releasedAt).toBeTruthy();
			const retentionMs = env.HOSTED_FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
			expect(released!.purgeAfter!.getTime()).toBeGreaterThan(Date.now() + retentionMs - 60_000);
			expect(await container.resolve(ObjectStorage).private.get(oldKey)).not.toBeNull();
			const current = await repo.findByFileKey(replacement.fileKey);
			expect(current?.ownerId).toBe(await pageIdOf(qrCode));
			expect(current?.itemId).toBe(documentId);
			expect(current?.slot).toBe('document');

			const page = await getPage(qrCode.shortUrl!.shortCode);
			expect(page).toHaveStatusCode(200);
			const body = JSON.parse(page.payload) as TPublicHostedPageResponseDto;
			expect(body.type).toBe('pdf');
			if (body.type === 'pdf') expect(body.title).toBe('Neue Karte');
		});

		it('keeps only the newest released files of a user within the retention period', async () => {
			const repository = container.resolve(StoredFileRepository);
			const userId = `user_retention_${randomUUID()}`;
			const now = Date.now();
			const keys = [0, 1, 2].map((age) => {
				const key = `hosted-pages/test/${randomUUID()}.pdf`;
				return { key, releasedAt: new Date(now - (3 - age) * 60_000) };
			});
			for (const { key, releasedAt } of keys) {
				await repository.create({
					id: randomUUID(),
					userId,
					ownerType: 'hosted_page',
					ownerId: randomUUID(),
					kind: 'pdf',
					visibility: 'private',
					fileKey: key,
					fileName: 'old.pdf',
					fileSize: 1,
					contentType: 'application/pdf',
					slot: 'document',
					itemId: null,
					claimedAt: releasedAt,
					releasedAt,
					purgeAfter: new Date(now + 24 * 60 * 60 * 1000),
					createdAt: releasedAt,
				});
			}

			try {
				// whole seconds: MySQL datetime rounds milliseconds, which would move the cutoff
				const cutoff = new Date(Math.floor(now / 1000) * 1000);
				await repository.purgeOldestRetained(userId, 2, cutoff);
				const [oldest, middle, newest] = await Promise.all(
					keys.map(({ key }) => repository.findByFileKey(key)),
				);
				expect(oldest?.purgeAfter?.getTime()).toBeLessThanOrEqual(cutoff.getTime());
				expect(middle?.purgeAfter?.getTime()).toBeGreaterThan(cutoff.getTime());
				expect(newest?.purgeAfter?.getTime()).toBeGreaterThan(cutoff.getTime());
			} finally {
				await db.delete(storedFile).where(eq(storedFile.userId, userId));
			}
		});

		it('keeps the storage keys out of a public share of the code', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const created = await testServer.inject({
				method: 'POST',
				url: `${QR_CODE_API_PATH}/${qrCode.id}/share`,
				payload: {},
				headers: authJson(accessTokenPro),
			});
			expect(created).toHaveStatusCode(201);
			const { shareToken } = JSON.parse(created.payload) as { shareToken: string };

			const shared = await testServer.inject({
				method: 'GET',
				url: `${API_BASE_PATH}/s/${shareToken}`,
			});
			expect(shared).toHaveStatusCode(200);
			expect(shared.payload).not.toContain(firstKey(qrCode));
			const { content } = JSON.parse(shared.payload) as {
				content: TQrCodeWithRelationsResponseDto['content'];
			};
			expect(content.type === 'pdf' && content.data.documents[0]?.fileKey).toBe(
				HOSTED_FILE_KEY_MASK,
			);
		});

		it('duplicates the file together with the code', async () => {
			const source = await createPdfCode(accessTokenPro);
			const response = await testServer.inject({
				method: 'POST',
				url: `${QR_CODE_API_PATH}/${source.id}/duplicate`,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
			});
			expect(response).toHaveStatusCode(201);
			const copy = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			if (copy.content.type === 'pdf' && source.content.type === 'pdf') {
				expect(firstKey(copy)).not.toBe(firstKey(source));
				expect(copy.content.data.documents[0].fileName).toBe(
					source.content.data.documents[0].fileName,
				);
			}
			expect(await getFile(copy.shortUrl!.shortCode)).toHaveStatusCode(200);
			expect(await getFile(source.shortUrl!.shortCode)).toHaveStatusCode(200);
		});

		it('discards every copy when a duplicate fails halfway', async () => {
			const cover = await uploadRequest(
				'image',
				MINIMAL_PNG,
				accessTokenPro,
				'cover.png',
				'image/png',
			);
			expect(cover).toHaveStatusCode(201);
			const source = await createPdfCode(accessTokenPro, {
				coverKey: (JSON.parse(cover.payload) as THostedUploadResponseDto).fileKey,
			});
			const files = () =>
				db
					.select({ id: storedFile.id })
					.from(storedFile)
					.where(eq(storedFile.userId, TEST_USER_PRO_ID));
			const before = (await files()).length;
			const fileService = container.resolve(HostedFileService);
			const copy = jest
				.spyOn(fileService, 'copy')
				.mockImplementationOnce((from, to) =>
					HostedFileService.prototype.copy.call(fileService, from, to),
				)
				.mockRejectedValueOnce(new Error('storage down'));
			try {
				const response = await testServer.inject({
					method: 'POST',
					url: `${QR_CODE_API_PATH}/${source.id}/duplicate`,
					headers: { Authorization: `Bearer ${accessTokenPro}` },
				});
				expect(response.statusCode).toBeGreaterThanOrEqual(400);
				expect(copy).toHaveBeenCalledTimes(2);
				expect((await files()).length).toBe(before);
			} finally {
				copy.mockRestore();
			}
		});

		it('releases the files when the code is deleted and takes the page offline', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const fileKey = firstKey(qrCode);
			const pageId = await pageIdOf(qrCode);

			const response = await testServer.inject({
				method: 'DELETE',
				url: `${QR_CODE_API_PATH}/${qrCode.id}`,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
			});
			expect(response).toHaveStatusCode(200);

			const released = await container.resolve(StoredFileRepository).findByFileKey(fileKey);
			expect(released?.releasedAt).toBeTruthy();
			expect(released?.purgeAfter).toBeTruthy();
			// the page is kept, soft deleted, for the retention period
			expect(await container.resolve(HostedPageRepository).findLiveById(pageId!)).toBeUndefined();
			const [deletedPage] = await container
				.resolve(HostedPageRepository)
				.findDeletedBefore(new Date(Date.now() + 60_000), 1000)
				.then((pages) => pages.filter((entry) => entry.id === pageId));
			expect(deletedPage?.deletedAt).toBeTruthy();
			const page = await getPage(qrCode.shortUrl!.shortCode);
			expect(page).toHaveStatusCode(404);
			expect(JSON.parse(page.payload).errorCode).toBe('HOSTED_PAGE_NOT_FOUND');
		});

		const usage = (landingPages: number, files: number): THostedUsage => ({ landingPages, files });

		it('caps landing pages and files, but lets an edit keep what it has', () => {
			const pro = HOSTED_PAGE_PLAN_LIMITS.pro;
			const policy = (
				before: THostedUsage,
				after: THostedUsage,
				limits: { maxLandingPages: number; maxFiles: number } = pro,
			) => new HostedPageLimitPolicy(limits, before, after);

			expect(() =>
				policy(usage(0, 0), usage(1, 1), HOSTED_PAGE_PLAN_LIMITS.free).checkAccess(),
			).toThrow();
			expect(policy(usage(0, 0), usage(1, 1)).checkAccess()).toBe(true);
			expect(
				policy(usage(pro.maxLandingPages - 1, 0), usage(pro.maxLandingPages, 1)).checkAccess(),
			).toBe(true);
			expect(() =>
				policy(usage(pro.maxLandingPages, 0), usage(pro.maxLandingPages + 1, 1)).checkAccess(),
			).toThrow(/landing page/);
			// a direct-open code takes a file but no landing page
			expect(
				policy(usage(pro.maxLandingPages, 0), usage(pro.maxLandingPages, 1)).checkAccess(),
			).toBe(true);
			expect(() =>
				policy(usage(1, pro.maxFiles), usage(1, pro.maxFiles + 1)).checkAccess(),
			).toThrow(/hosted file/);
			// a higher effective limit (a later add-on) lets the save through
			expect(
				policy(usage(1, pro.maxFiles), usage(1, pro.maxFiles + 1), {
					...pro,
					maxFiles: pro.maxFiles + 10,
				}).checkAccess(),
			).toBe(true);
			// over the limit after a downgrade: editing without growing passes, growing does not
			const over = usage(pro.maxLandingPages + 2, 1);
			const free = HOSTED_PAGE_PLAN_LIMITS.free;
			expect(policy(over, over, free).checkAccess()).toBe(true);
			expect(() => policy(over, usage(pro.maxLandingPages + 2, 2), free).checkAccess()).toThrow();
		});

		it('keeps pages online through the grace period and takes them offline with the Pro features', async () => {
			const qrCode = await createPdfCode(accessToken2, {
				hideBranding: true,
				theme: { primaryColor: '#ff0000' },
			});
			const direct = await createPdfCode(accessToken2, { openMode: 'direct' });
			const shortCode = qrCode.shortUrl!.shortCode;
			const directCode = direct.shortUrl!.shortCode;
			const subscriptions = container.resolve(UserSubscriptionRepository);

			// cancelled and past the paid period: the grace period keeps everything as it was
			await subscriptions.update((await subscriptions.findByUserId(TEST_USER_2_ID))!, {
				status: 'canceled',
				gracePeriodEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			});
			const during = await getPage(shortCode);
			expect(during).toHaveStatusCode(200);
			const page = JSON.parse(during.payload) as TPublicHostedPageResponseDto;
			expect(page.showBranding).toBe(false);
			expect(page.theme.primaryColor).toBe('#ff0000');
			expect(JSON.parse((await internalLookup(directCode)).payload).destinationUrl).toContain(
				`/u/${directCode}/file/`,
			);

			// new pages need an active plan, even during the grace period (the plan is checked first)
			const upload = await uploadPdf(accessTokenPro);
			const refused = await createCode(pdfDto(upload), accessToken2);
			expect(refused).toHaveStatusCode(403);
			expect(JSON.parse(refused.payload).message).toMatch(/^Plan limit exceeded/);

			// the grace period job disables the Pro features: pages and files go offline
			await container.resolve(DisableProFeaturesUseCase).execute(TEST_USER_2_ID);
			const offline = await getPage(shortCode);
			expect(offline).toHaveStatusCode(404);
			expect(JSON.parse(offline.payload).errorCode).toBe('HOSTED_PAGE_DISABLED');
			expect(await getFile(shortCode)).toHaveStatusCode(404);
			expect(await getFile(directCode)).toHaveStatusCode(404);
			// a direct-open scan no longer reaches the file but the page, which says it is offline
			const lookup = JSON.parse((await internalLookup(directCode)).payload);
			expect(lookup.hostedType).toBe('pdf');
			expect(lookup.destinationUrl).not.toContain('/file');

			// resubscribing brings everything back as it was
			await subscriptions.update((await subscriptions.findByUserId(TEST_USER_2_ID))!, {
				status: 'active',
			});
			await container.resolve(EnableProFeaturesUseCase).execute(TEST_USER_2_ID);
			const back = await getPage(shortCode);
			expect(back).toHaveStatusCode(200);
			expect((JSON.parse(back.payload) as TPublicHostedPageResponseDto).showBranding).toBe(false);
			expect(await getFile(directCode)).toHaveStatusCode(200);
		});
	});

	describe('GET /hosted-page/usage', () => {
		const getUsage = (token?: string) =>
			testServer.inject({
				method: 'GET',
				url: `${HOSTED_API_PATH}/usage`,
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});

		const readUsage = async (token: string, query = '') =>
			JSON.parse(
				(
					await testServer.inject({
						method: 'GET',
						url: `${HOSTED_API_PATH}/usage${query}`,
						headers: { Authorization: `Bearer ${token}` },
					})
				).payload,
			) as THostedPageUsageResponseDto;

		it('reports landing pages and files with the limits of the plan', async () => {
			const before = await getUsage(accessTokenPro);
			expect(before).toHaveStatusCode(200);
			const usage = JSON.parse(before.payload) as THostedPageUsageResponseDto;
			const pro = HOSTED_PAGE_PLAN_LIMITS.pro;
			expect(usage.plan).toBe('pro');
			expect(usage.landingPages.limit).toBe(pro.maxLandingPages);
			expect(usage.landingPages.remaining).toBe(
				Math.max(0, usage.landingPages.limit - usage.landingPages.used),
			);
			expect(usage.files.limit).toBe(pro.maxFiles);
			expect(usage.files.remaining).toBe(Math.max(0, usage.files.limit - usage.files.used));
			expect(usage.maxFileSizeBytes).toEqual(pro.maxFileSizeBytes);

			// a landing page with a PDF takes a page and a file
			const page = await createPdfCode(accessTokenPro);
			const afterPage = await readUsage(accessTokenPro);
			expect(afterPage.landingPages.used).toBe(usage.landingPages.used + 1);
			expect(afterPage.files.used).toBe(usage.files.used + 1);

			// a PDF that opens directly takes a file, no landing page
			const direct = await createPdfCode(accessTokenPro, { openMode: 'direct' });
			const afterDirect = await readUsage(accessTokenPro);
			expect(afterDirect.landingPages.used).toBe(afterPage.landingPages.used);
			expect(afterDirect.files.used).toBe(afterPage.files.used + 1);

			// the editor leaves out the code it edits and adds its draft itself
			const excluded = await readUsage(accessTokenPro, `?excludeQrCodeId=${page.id}`);
			expect(excluded.landingPages.used).toBe(afterDirect.landingPages.used - 1);
			expect(excluded.files.used).toBe(afterDirect.files.used - 1);

			await deleteQrCode(page.id, accessTokenPro);
			await deleteQrCode(direct.id, accessTokenPro);
			const cleaned = await readUsage(accessTokenPro);
			expect(cleaned.landingPages.used).toBe(usage.landingPages.used);
			expect(cleaned.files.used).toBe(usage.files.used);
		});

		it('counts a direct PDF switched to a landing page against the page limit', async () => {
			const direct = await createPdfCode(accessTokenPro, { openMode: 'direct' });
			const usage = await readUsage(accessTokenPro);
			const data = direct.content.type === 'pdf' ? direct.content.data : null;
			const response = await testServer.inject({
				method: 'PATCH',
				url: `${QR_CODE_API_PATH}/${direct.id}`,
				headers: authJson(accessTokenPro),
				payload: { content: { type: 'pdf', data: { ...data, openMode: 'page' } } },
			});
			expect(response).toHaveStatusCode(200);
			const after = await readUsage(accessTokenPro);
			expect(after.landingPages.used).toBe(usage.landingPages.used + 1);
			expect(after.files.used).toBe(usage.files.used);
		});

		it('shows the free plan without hosted pages', async () => {
			const usage = await readUsage(accessToken);
			expect(usage.plan).toBe('free');
			expect(usage.landingPages).toEqual({ used: usage.landingPages.used, limit: 0, remaining: 0 });
			expect(usage.files.limit).toBe(0);
		});

		it('requires authentication', async () => {
			expect(await getUsage()).toHaveStatusCode(401);
		});
	});

	describe('page entity', () => {
		const urlCodeDto = () =>
			({
				name: faker.lorem.words(2),
				config: QrCodeDefaults,
				content: { type: 'url', data: { url: 'https://example.com', isDynamic: true } },
			}) as unknown as TCreateQrCodeDto;

		it('never hands the short code of a page to another QR code', async () => {
			const page = await createPdfCode(accessTokenPro);
			const reserved = await container
				.resolve(GetReservedShortCodeUseCase)
				.execute(TEST_USER_PRO_ID);
			expect(reserved.shortCode).not.toBe(page.shortUrl!.shortCode);
			expect(reserved.hostedPageId).toBeNull();
		});

		it('gives parallel creates different short codes', async () => {
			const [first, second] = await Promise.all([
				createCode(urlCodeDto(), accessTokenPro),
				createCode(urlCodeDto(), accessTokenPro),
			]);
			expect(first).toHaveStatusCode(201);
			expect(second).toHaveStatusCode(201);
			const codes = [first, second].map(
				(response) =>
					(JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto).shortUrl?.shortCode,
			);
			expect(codes[0]).toBeTruthy();
			expect(codes[0]).not.toBe(codes[1]);
		});

		it('refuses short URL edits, duplicates and deletes on a page link', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const shortCode = qrCode.shortUrl!.shortCode;
			// the page link is not a standalone short URL, but its short URL route must refuse anyway
			const patch = await testServer.inject({
				method: 'PATCH',
				url: `${SHORT_URL_API_PATH}/${shortCode}`,
				headers: authJson(accessTokenPro),
				payload: { destinationUrl: 'https://example.com' },
			});
			expect(patch).toHaveStatusCode(400);
			const duplicate = await testServer.inject({
				method: 'POST',
				url: `${SHORT_URL_API_PATH}/${shortCode}/duplicate`,
				headers: authJson(accessTokenPro),
				payload: {},
			});
			expect(duplicate.statusCode).toBeGreaterThanOrEqual(400);
			const removal = await testServer.inject({
				method: 'DELETE',
				url: `${SHORT_URL_API_PATH}/${shortCode}`,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
			});
			expect(removal.statusCode).toBeGreaterThanOrEqual(400);
			expect(await getPage(shortCode)).toHaveStatusCode(200);
		});

		it('keeps the list working when a code lost its page, and still deletes that code', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const listCodes = async () => {
				const list = await testServer.inject({
					method: 'GET',
					url: `${QR_CODE_API_PATH}?limit=100`,
					headers: { Authorization: `Bearer ${accessTokenPro}` },
				});
				expect(list).toHaveStatusCode(200);
				return JSON.parse(list.payload) as { total: number; data: { id: string }[] };
			};
			const intact = await listCodes();
			await db
				.update(shortUrl)
				.set({ hostedPageId: null })
				.where(eq(shortUrl.shortCode, qrCode.shortUrl!.shortCode));

			const broken = await listCodes();
			expect(broken.data.map((entry) => entry.id)).not.toContain(qrCode.id);
			// the count follows what the list shows
			expect(broken.total).toBe(intact.total - 1);

			expect(await deleteQrCode(qrCode.id, accessTokenPro)).toHaveStatusCode(200);
		});

		it('purges a deleted page after the retention period', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const pageId = (await pageIdOf(qrCode))!;
			expect(await deleteQrCode(qrCode.id, accessTokenPro)).toHaveStatusCode(200);

			const job = container.resolve(PurgeDeletedHostedPagesCronJob);
			const retention = env.HOSTED_FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
			// within the retention period the page stays
			await job.purge(new Date(Date.now() + retention - 60_000));
			const stillThere = await container
				.resolve(HostedPageRepository)
				.findDeletedBefore(new Date(Date.now() + 60_000), 1000);
			expect(stillThere.some((page) => page.id === pageId)).toBe(true);

			await job.purge(new Date(Date.now() + retention + 60_000));
			const after = await container
				.resolve(HostedPageRepository)
				.findDeletedBefore(new Date(Date.now() + 60_000), 1000);
			expect(after.some((page) => page.id === pageId)).toBe(false);
			const link = await container
				.resolve(ShortUrlRepository)
				.findOneByShortCode(qrCode.shortUrl!.shortCode);
			expect(link?.hostedPageId).toBeNull();
			expect(link?.deletedAt).toBeTruthy();
		});

		it('releases against what a racing save wrote, so no file stays claimed unused', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const service = container.resolve(HostedPageService);
			const loaded = (await container.resolve(QrCodeRepository).findOneById(qrCode.id))!;
			const first = await uploadPdf(accessTokenPro);
			const second = await uploadPdf(accessTokenPro);
			const withDocument = (upload: THostedUploadResponseDto) =>
				({
					type: 'pdf',
					data: {
						title: 'Karte',
						isDynamic: true,
						documents: [
							{ fileKey: upload.fileKey, fileName: upload.fileName, fileSize: upload.fileSize },
						],
					},
				}) as THostedPageContent;

			// both saves are checked against the same page before either is written
			const planA = await service.prepareUpdate(loaded, withDocument(first));
			const planB = await service.prepareUpdate(loaded, withDocument(second));
			await UnitOfWork.run(() => service.applyUpdate(planA));
			await UnitOfWork.run(() => service.applyUpdate(planB));

			const files = container.resolve(StoredFileRepository);
			expect((await files.findByFileKey(firstKey(qrCode)))?.releasedAt).toBeTruthy();
			expect((await files.findByFileKey(first.fileKey))?.releasedAt).toBeTruthy();
			expect((await files.findByFileKey(second.fileKey))?.releasedAt).toBeNull();
		});

		it('queues a page with a link button for the safety re-check, and takes it out without one', async () => {
			const link = { label: 'Tisch reservieren', url: 'https://example.com/reservieren' };
			const qrCode = await createPdfCode(accessTokenPro, { link });
			const shortUrls = container.resolve(ShortUrlRepository);
			const shortCode = qrCode.shortUrl!.shortCode;
			expect((await shortUrls.findOneByShortCode(shortCode))?.nextSafetyCheckAt).toBeTruthy();
			const due = await shortUrls.findDueForSafetyCheck(1000, new Date(Date.now() + 86_400_000));
			expect(due.some((row) => row.shortCode === shortCode)).toBe(true);
			expect(
				await container.resolve(HostedPageService).outboundUrlsOf((await pageIdOf(qrCode))!),
			).toEqual([link.url]);

			const data = qrCode.content.type === 'pdf' ? qrCode.content.data : undefined;
			const response = await testServer.inject({
				method: 'PATCH',
				url: `${QR_CODE_API_PATH}/${qrCode.id}`,
				payload: { content: { type: 'pdf', data: { ...data, link: undefined } } },
				headers: authJson(accessTokenPro),
			});
			expect(response).toHaveStatusCode(200);
			expect((await shortUrls.findOneByShortCode(shortCode))?.nextSafetyCheckAt).toBeNull();
		});

		it('lifts a block that came from a button once the owner removes it, but never a manual one', async () => {
			const link = { label: 'Tisch reservieren', url: 'https://example.com/reservieren' };
			const shortUrls = container.resolve(ShortUrlRepository);
			const removeButton = (qrCode: TQrCodeWithRelationsResponseDto) => {
				const data = qrCode.content.type === 'pdf' ? qrCode.content.data : undefined;
				return testServer.inject({
					method: 'PATCH',
					url: `${QR_CODE_API_PATH}/${qrCode.id}`,
					payload: { content: { type: 'pdf', data: { ...data, link: undefined } } },
					headers: authJson(accessTokenPro),
				});
			};

			const flagged = await createPdfCode(accessTokenPro, { link });
			const flaggedLink = (await shortUrls.findOneByShortCode(flagged.shortUrl!.shortCode))!;
			await shortUrls.blockForSafety(flaggedLink.id, ['SOCIAL_ENGINEERING'], new Date());
			expect(await removeButton(flagged)).toHaveStatusCode(200);
			const lifted = await shortUrls.findOneById(flaggedLink.id);
			expect(lifted?.safetyStatus).toBe('clean');
			// switched back on by the owner, as after any lifted block
			expect(lifted?.isActive).toBe(false);

			const reviewed = await createPdfCode(accessTokenPro, { link });
			const reviewedLink = (await shortUrls.findOneByShortCode(reviewed.shortUrl!.shortCode))!;
			await shortUrls.blockForSafety(reviewedLink.id, ['MANUAL_ABUSE_REVIEW'], new Date());
			expect(await removeButton(reviewed)).toHaveStatusCode(200);
			expect((await shortUrls.findOneById(reviewedLink.id))?.safetyStatus).toBe('blocked');
		});

		it('screens only new buttons on save, as a redirect screens only a new destination', async () => {
			const link = { label: 'Tisch reservieren', url: 'https://example.com/reservieren' };
			const qrCode = await createPdfCode(accessTokenPro, { link });
			// an unchanged button that got listed meanwhile is the re-check's: a save of other
			// changes must neither fail on it nor count it as an offence
			const check = jest
				.spyOn(container.resolve(DestinationUrlSafetyService), 'assertDestinationUrlSafe')
				.mockRejectedValue(new BadRequestError('unsafe destination'));
			try {
				const data = qrCode.content.type === 'pdf' ? qrCode.content.data : undefined;
				const response = await testServer.inject({
					method: 'PATCH',
					url: `${QR_CODE_API_PATH}/${qrCode.id}`,
					payload: { content: { type: 'pdf', data: { ...data, title: 'Neue Karte' } } },
					headers: authJson(accessTokenPro),
				});
				expect(response).toHaveStatusCode(200);
				expect(check).not.toHaveBeenCalled();
			} finally {
				check.mockRestore();
			}
		});
	});

	describe('GET /hosted-page/by-code/:shortCode', () => {
		it('serves an active PDF page with branding by default', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const response = await getPage(qrCode.shortUrl!.shortCode);
			expect(response).toHaveStatusCode(200);

			const page = JSON.parse(response.payload) as TPublicHostedPageResponseDto;
			expect(page.type).toBe('pdf');
			expect(page.showBranding).toBe(true);
			if (page.type === 'pdf') {
				expect(page.title).toBe('Speisekarte');
				expect(page.documents).toHaveLength(1);
				expect(page.documents[0].fileUrl).toContain(`/u/${qrCode.shortUrl!.shortCode}/file/`);
				expect(page.documents[0].downloadUrl).toContain('download=1');
			}
		});

		it('serves several documents, a cover and a link on one page', async () => {
			const menu = await uploadPdf(accessTokenPro);
			const wine = await uploadPdf(accessTokenPro);
			const cover = await uploadRequest(
				'image',
				MINIMAL_PNG,
				accessTokenPro,
				'cover.png',
				'image/png',
			);
			const coverKey = (JSON.parse(cover.payload) as THostedUploadResponseDto).fileKey;

			const response = await createCode(
				pdfDto(menu, {
					brandName: 'Trattoria Demo',
					coverKey,
					buttonLabel: 'Karte ansehen',
					link: { label: 'Tisch reservieren', url: 'https://example.com/reservieren' },
					documents: [
						{
							title: 'Speisekarte',
							fileKey: menu.fileKey,
							fileName: menu.fileName,
							fileSize: menu.fileSize,
						},
						{
							title: 'Weinkarte',
							fileKey: wine.fileKey,
							fileName: wine.fileName,
							fileSize: wine.fileSize,
						},
					],
				}),
				accessTokenPro,
			);
			expect(response).toHaveStatusCode(201);
			const qrCode = JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;

			const page = JSON.parse(
				(await getPage(qrCode.shortUrl!.shortCode)).payload,
			) as TPublicHostedPageResponseDto;
			expect(page.type).toBe('pdf');
			if (page.type === 'pdf') {
				expect(page.brandName).toBe('Trattoria Demo');
				expect(page.coverUrl).toContain(coverKey);
				expect(page.link?.label).toBe('Tisch reservieren');
				expect(page.documents.map((d) => d.title)).toEqual(['Speisekarte', 'Weinkarte']);
				const wineId = page.documents[1].id;
				expect(wineId).toBeTruthy();
				expect(page.documents[1].fileUrl).toContain(`/file/${wineId}`);
				expect(await getFile(qrCode.shortUrl!.shortCode, `?document=${wineId}`)).toHaveStatusCode(
					200,
				);
			}
			expect(await getFile(qrCode.shortUrl!.shortCode, '?document=unknown')).toHaveStatusCode(404);
			const coverRow = await container.resolve(StoredFileRepository).findByFileKey(coverKey);
			expect(coverRow?.slot).toBe('cover');
			expect(coverRow?.ownerId).toBe(await pageIdOf(qrCode));
		});

		it('screens the link button with Web Risk and refuses an unsafe one', async () => {
			const safety = container.resolve(DestinationUrlSafetyService);
			const check = jest
				.spyOn(safety, 'assertDestinationUrlSafe')
				.mockRejectedValueOnce(new BadRequestError('unsafe destination'));
			try {
				const upload = await uploadPdf(accessTokenPro);
				const link = { label: 'Konto bestätigen', url: 'https://phishing.example.com/login' };
				const response = await createCode(pdfDto(upload, { link }), accessTokenPro);
				expect(response).toHaveStatusCode(400);
				expect(check).toHaveBeenCalledWith(link.url, TEST_USER_PRO_ID, 'create');
			} finally {
				check.mockRestore();
			}
		});

		it('rejects a link that is not http(s)', async () => {
			const upload = await uploadPdf(accessTokenPro);
			const response = await createCode(
				pdfDto(upload, { link: { label: 'Nope', url: 'javascript:alert(1)' } }),
				accessTokenPro,
			);
			expect(response).toHaveStatusCode(400);
		});

		it('refuses half a link button: text without address, or address without text', async () => {
			const upload = await uploadPdf(accessTokenPro);
			for (const link of [
				{ label: 'Tisch reservieren', url: '' },
				{ label: '', url: 'https://example.com/reservieren' },
			]) {
				const response = await createCode(pdfDto(upload, { link }), accessTokenPro);
				expect(response).toHaveStatusCode(400);
			}
		});

		it('honours hidden branding and the primary color on the pro plan', async () => {
			const qrCode = await createPdfCode(accessTokenPro, {
				hideBranding: true,
				theme: { primaryColor: '#ff0000' },
			});
			const response = await getPage(qrCode.shortUrl!.shortCode);
			expect(response).toHaveStatusCode(200);

			const page = JSON.parse(response.payload) as TPublicHostedPageResponseDto;
			expect(page.showBranding).toBe(false);
			expect(page.theme.primaryColor).toBe('#ff0000');
		});

		it('reports the hosted type to the scan lookup', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const code = qrCode.shortUrl!.shortCode;
			const response = await internalLookup(code);
			expect(response).toHaveStatusCode(200);
			const body = JSON.parse(response.payload);
			expect(body.hostedType).toBe('pdf');
			// the one address of the page, the same the QR code encodes
			expect(body.hostedUrl).toMatch(new RegExp(`^https?://[^/]+/u/${code}$`));
			const page = JSON.parse((await getPage(code)).payload) as TPublicHostedPageResponseDto;
			expect(page.url).toBe(body.hostedUrl);
		});

		it('sends a scan straight to the document when the owner chose "open directly"', async () => {
			const qrCode = await createPdfCode(accessTokenPro, { openMode: 'direct' });
			const response = await internalLookup(qrCode.shortUrl!.shortCode);
			expect(response).toHaveStatusCode(200);
			const body = JSON.parse(response.payload);
			expect(body.hostedType).toBeNull();
			expect(body.destinationUrl).toContain(`/u/${qrCode.shortUrl!.shortCode}/file/`);
			// the page itself stays reachable through its link
			expect(await getPage(qrCode.shortUrl!.shortCode)).toHaveStatusCode(200);
		});

		it('answers 404 with HOSTED_PAGE_DISABLED once the code is switched off', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const shortCode = qrCode.shortUrl!.shortCode;
			expect(await getPage(shortCode)).toHaveStatusCode(200);

			const toggle = await testServer.inject({
				method: 'PATCH',
				url: `${SHORT_URL_API_PATH}/${shortCode}/toggle-active-state`,
				headers: { Authorization: `Bearer ${accessTokenPro}` },
			});
			expect(toggle).toHaveStatusCode(200);

			const response = await getPage(shortCode);
			expect(response).toHaveStatusCode(404);
			expect(JSON.parse(response.payload).errorCode).toBe('HOSTED_PAGE_DISABLED');
			expect(await getFile(shortCode)).toHaveStatusCode(404);
		});

		it('answers 404 with HOSTED_PAGE_BLOCKED once the code was blocked for abuse', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const shortCode = qrCode.shortUrl!.shortCode;
			await db
				.update(shortUrl)
				.set({ safetyStatus: 'blocked' })
				.where(eq(shortUrl.shortCode, shortCode));

			const response = await getPage(shortCode);
			expect(response).toHaveStatusCode(404);
			expect(JSON.parse(response.payload).errorCode).toBe('HOSTED_PAGE_BLOCKED');
			expect(await getFile(shortCode)).toHaveStatusCode(404);
		});

		it('answers 404 for unknown codes', async () => {
			expect(await getPage('zzzzz')).toHaveStatusCode(404);
		});

		it('opens a document directly only when the page holds exactly one', async () => {
			const [first, second] = [await uploadPdf(accessTokenPro), await uploadPdf(accessTokenPro)];
			const document = (upload: THostedUploadResponseDto) => ({
				fileKey: upload.fileKey,
				fileName: upload.fileName,
				fileSize: upload.fileSize,
			});
			const response = await createCode(
				pdfDto(first, { openMode: 'direct', documents: [document(first), document(second)] }),
				accessTokenPro,
			);
			expect(response).toHaveStatusCode(400);
		});
	});

	describe('GET /hosted-page/by-code/:shortCode/files/:documentId', () => {
		it('serves the PDF inline for its own page only', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const response = await getFile(qrCode.shortUrl!.shortCode);
			expect(response).toHaveStatusCode(200);
			expect(response.headers['content-type']).toBe('application/pdf');
			expect(response.headers['content-disposition']).toContain('inline');
			// the frontend serves the file under the page's address: same origin as the page
			expect(response.headers['content-security-policy']).toBe("frame-ancestors 'none'");
			expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
			expect(response.headers['cache-control']).toBe('private, no-cache');
			expect(response.headers['x-content-type-options']).toBe('nosniff');
			expect(response.headers['x-robots-tag']).toBe('noindex, nofollow, noarchive');
			expect(response.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
			expect(response.rawPayload.length).toBe(MINIMAL_PDF.length);
			expect(response.headers['content-length']).toBe(String(MINIMAL_PDF.length));

			const etag = response.headers.etag as string;
			const notModified = await getFile(qrCode.shortUrl!.shortCode, '', { 'if-none-match': etag });
			expect(notModified).toHaveStatusCode(304);
			// a 304 refreshes the cached headers, so it has to carry the embedding policy as well
			expect(notModified.headers['content-security-policy']).toBe("frame-ancestors 'none'");
			expect(notModified.headers['content-length']).toBeUndefined();
		});

		it('serves byte ranges, so viewers and players can load large files in parts', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const code = qrCode.shortUrl!.shortCode;
			const size = MINIMAL_PDF.length;

			const head = await getFile(code, '', { range: 'bytes=0-4' });
			expect(head).toHaveStatusCode(206);
			expect(head.rawPayload.toString()).toBe('%PDF-');
			expect(head.headers['content-range']).toBe(`bytes 0-4/${size}`);
			expect(head.headers['content-length']).toBe('5');
			expect(head.headers['accept-ranges']).toBe('bytes');

			const tail = await getFile(code, '', { range: 'bytes=-3' });
			expect(tail).toHaveStatusCode(206);
			expect(tail.rawPayload.equals(MINIMAL_PDF.subarray(size - 3))).toBe(true);

			const beyond = await getFile(code, '', { range: `bytes=${size}-` });
			expect(beyond).toHaveStatusCode(416);
			expect(beyond.headers['content-range']).toBe(`bytes */${size}`);

			// a range of a file that was swapped meanwhile gets the whole new file
			const stale = await getFile(code, '', { range: 'bytes=0-4', 'if-range': '"outdated"' });
			expect(stale).toHaveStatusCode(200);
			expect(stale.rawPayload.length).toBe(size);
		});

		it('answers only the frontend, and only for the host of the page', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const code = qrCode.shortUrl!.shortCode;
			const documentId = qrCode.content.type === 'pdf' ? qrCode.content.data.documents[0]?.id : '';
			const url = `${HOSTED_API_PATH}/by-code/${code}/files/${documentId}`;

			// a browser cannot reach the backend file route directly any more
			expect(await testServer.inject({ method: 'GET', url })).toHaveStatusCode(401);
			// another host (a brand host, another customer's domain) gets nothing
			const foreignHost = await testServer.inject({
				method: 'GET',
				url,
				headers: {
					'x-internal-api-key': env.INTERNAL_API_SECRET,
					'x-hosted-host': 'other-customer.example.com',
				},
			});
			expect(foreignHost).toHaveStatusCode(404);
			expect(await getFile(code, `?document=${documentId}`)).toHaveStatusCode(200);
		});

		it('lives on the custom domain of its short URL, where its files are served', async () => {
			const domainContext = await getDomainTestContext();
			const domain = `pdf-${faker.string.alphanumeric(8).toLowerCase()}.example.com`;
			const domainId = await createCustomDomainDirectly(domainContext, domain, TEST_USER_PRO_ID, {
				sslStatus: 'active',
				ownershipStatus: 'verified',
				verificationPhase: 'cloudflare_ssl',
				ownershipTxtVerified: true,
				cnameVerified: true,
			});
			const qrCode = await createPdfCode(accessTokenPro);
			await db
				.update(shortUrl)
				.set({ customDomainId: domainId })
				.where(eq(shortUrl.shortCode, qrCode.shortUrl!.shortCode));

			try {
				const code = qrCode.shortUrl!.shortCode;
				const page = JSON.parse((await getPage(code)).payload) as TPublicHostedPageResponseDto;
				expect(page.url).toBe(`https://${domain}/u/${code}`);
				expect(JSON.parse((await internalLookup(code)).payload).hostedUrl).toBe(page.url);

				expect(page.documents[0]?.fileUrl).toBe(
					`https://${domain}/u/${code}/file/${page.documents[0]?.id}`,
				);
				const response = await getFile(code);
				expect(response).toHaveStatusCode(200);

				// Cloudflare sends customer-domain visitors to the brand host, so files are served there too
				const brandHost = new URL(env.FRONTEND_URL).host;
				expect(await getFile(code, '', { 'x-hosted-host': brandHost })).toHaveStatusCode(200);
				// ...but never on another customer's domain
				expect(
					await getFile(code, '', { 'x-hosted-host': 'other-customer.example.com' }),
				).toHaveStatusCode(404);
			} finally {
				await db
					.update(shortUrl)
					.set({ customDomainId: null })
					.where(eq(shortUrl.shortCode, qrCode.shortUrl!.shortCode));
				await deleteCustomDomainDirectly(domainId);
			}
		});

		it('answers HEAD with the headers only', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const response = await fileRequest(qrCode.shortUrl!.shortCode, '', {}, 'HEAD');
			expect(response).toHaveStatusCode(200);
			expect(response.headers['content-type']).toBe('application/pdf');
			expect(response.headers['content-length']).toBe(String(MINIMAL_PDF.length));
			expect(response.headers['content-security-policy']).toBe("frame-ancestors 'none'");
			expect(response.rawPayload.length).toBe(0);
		});

		it('serves the PDF as attachment with download=1', async () => {
			const qrCode = await createPdfCode(accessTokenPro);
			const response = await getFile(qrCode.shortUrl!.shortCode, '?download=1');
			expect(response).toHaveStatusCode(200);
			expect(response.headers['content-disposition']).toContain('attachment');
		});
	});
});
