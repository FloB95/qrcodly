import type { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { container } from 'tsyringe';
import {
	getHostedFileRefs,
	getHostedServedFiles,
	HOSTED_PAGE_TYPES,
	HOSTED_PAGE_TYPE_DEFINITIONS,
	QrCodeDefaults,
	replaceHostedFileKey,
	withHostedDocumentIds,
	type THostedPageType,
	type THostedPageUsageResponseDto,
	type THostedUploadKind,
	type THostedUploadResponseDto,
	type TPublicHostedPageResponseDto,
	type TQrCodeContent,
	type TQrCodeWithRelationsResponseDto,
} from '@shared/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import { resetTestState, TEST_USER_2_ID, TEST_USER_PRO_ID } from '@/tests/shared/test-context';
import {
	getTestContext as getBillingTestContext,
	createSubscriptionDirectly,
	cleanupCreatedSubscriptions,
	cleanupSubscriptionsForUser,
	type TestContext as BillingTestContext,
} from '@/modules/billing/http/__tests__/utils';
import { env } from '@/core/config/env';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import StoredFileRepository from '@/modules/stored-file/domain/repository/stored-file.repository';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import { createQrCodeRequest, getTestContext } from '@/modules/qr-code/http/__tests__/utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;
const HOSTED_API_PATH = `${API_BASE_PATH}/hosted-page`;

const FILES: Record<THostedUploadKind, { content: Buffer; filename: string; contentType: string }> =
	{
		pdf: {
			content: Buffer.from(
				'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
			),
			filename: 'document.pdf',
			contentType: 'application/pdf',
		},
		image: {
			content: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
				'base64',
			),
			filename: 'image.png',
			contentType: 'image/png',
		},
	};

type TUpload = (kind: THostedUploadKind) => Promise<THostedUploadResponseDto>;

/**
 * Content that uses every file slot of a page type. `Record<THostedPageType, …>` makes a newly
 * registered page type fail to compile until it brings a fixture, so it is tested from day one.
 */
const PAGE_TYPE_FIXTURES: Record<THostedPageType, (upload: TUpload) => Promise<TQrCodeContent>> = {
	pdf: async (upload) => {
		const [first, second, cover, logo] = [
			await upload('pdf'),
			await upload('pdf'),
			await upload('image'),
			await upload('image'),
		];
		const document = (file: THostedUploadResponseDto, title: string) => ({
			title,
			fileKey: file.fileKey,
			fileName: file.fileName,
			fileSize: file.fileSize,
		});
		return {
			type: 'pdf',
			data: {
				title: 'Contract page',
				documents: [document(first, 'First'), document(second, 'Second')],
				coverKey: cover.fileKey,
				logoKey: logo.fileKey,
				isDynamic: true,
			},
		};
	},
	product: async (upload) => {
		const [manual, declaration, cover, logo] = [
			await upload('pdf'),
			await upload('pdf'),
			await upload('image'),
			await upload('image'),
		];
		const file = (upload: THostedUploadResponseDto) => ({
			fileKey: upload.fileKey,
			fileName: upload.fileName,
			fileSize: upload.fileSize,
		});
		return {
			type: 'product',
			data: {
				title: 'Contract product',
				model: 'CP-1',
				manufacturer: {
					name: 'Contract GmbH',
					address: 'Musterstraße 1, 12345 Musterstadt',
					email: 'info@example.com',
				},
				documents: [
					{ category: 'manual', language: 'de', ...file(manual) },
					{ category: 'declaration', language: 'en', ...file(declaration) },
				],
				coverKey: cover.fileKey,
				logoKey: logo.fileKey,
				isDynamic: true,
			},
		};
	},
};

describe('Hosted page type contract', () => {
	let testServer: FastifyInstance;
	let accessToken: string;
	let accessTokenPro: string;
	let billingCtx: BillingTestContext;

	const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

	const upload =
		(token: string): TUpload =>
		async (kind) => {
			const file = FILES[kind];
			const formData = new FormData();
			formData.append('kind', kind);
			formData.append('file', file.content, {
				filename: file.filename,
				contentType: file.contentType,
			});
			const response = await testServer.inject({
				method: 'POST',
				url: `${HOSTED_API_PATH}/upload`,
				payload: formData,
				headers: { ...auth(token), ...formData.getHeaders() },
			});
			expect(response).toHaveStatusCode(201);
			return JSON.parse(response.payload) as THostedUploadResponseDto;
		};

	const usedPages = async () =>
		(
			JSON.parse(
				(
					await testServer.inject({
						method: 'GET',
						url: `${HOSTED_API_PATH}/usage`,
						headers: auth(accessTokenPro),
					})
				).payload,
			) as THostedPageUsageResponseDto
		).landingPages.used;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
		accessTokenPro = ctx.accessTokenPro;
		billingCtx = await getBillingTestContext();
		await createSubscriptionDirectly(billingCtx, TEST_USER_PRO_ID);
		await createSubscriptionDirectly(billingCtx, TEST_USER_2_ID);
	});

	afterAll(async () => {
		await cleanupCreatedSubscriptions(billingCtx);
		await cleanupSubscriptionsForUser(TEST_USER_2_ID);
	});

	it('has a fixture for every registered page type', () => {
		expect(Object.keys(PAGE_TYPE_FIXTURES).sort()).toEqual([...HOSTED_PAGE_TYPES].sort());
		expect(Object.keys(HOSTED_PAGE_TYPE_DEFINITIONS).sort()).toEqual([...HOSTED_PAGE_TYPES].sort());
	});

	describe.each([...HOSTED_PAGE_TYPES])('%s', (type) => {
		it('keeps the definition consistent: ids, key swaps and served files', async () => {
			const content = withHostedDocumentIds(
				await PAGE_TYPE_FIXTURES[type](upload(accessTokenPro)),
				(() => {
					let n = 0;
					return () => `doc${++n}`;
				})(),
			);
			const refs = getHostedFileRefs(content);
			expect(refs.length).toBeGreaterThan(0);
			for (const ref of refs) expect(ref.slot).toBeTruthy();

			const served = getHostedServedFiles(content);
			for (const file of served) expect(file.documentId).toBeTruthy();
			expect(new Set(served.map((file) => file.documentId)).size).toBe(served.length);

			const firstKey = refs[0]?.key ?? '';
			const swapped = replaceHostedFileKey(content, firstKey, 'swapped-key');
			const swappedKeys = getHostedFileRefs(swapped).map((ref) => ref.key);
			expect(swappedKeys).toContain('swapped-key');
			expect(swappedKeys).not.toContain(firstKey);
			// ids survive a key swap
			expect(getHostedServedFiles(swapped).map((file) => file.documentId)).toEqual(
				served.map((file) => file.documentId),
			);
		});

		it('is Pro only', async () => {
			// the plan is checked before the files, so another user's keys cannot mask the answer
			const content = await PAGE_TYPE_FIXTURES[type](upload(accessTokenPro));
			const response = await createQrCodeRequest(
				testServer,
				{ name: 'free', config: QrCodeDefaults, content },
				accessToken,
			);
			expect(response).toHaveStatusCode(403);
			expect(JSON.parse(response.payload).message).toMatch(/^Plan limit exceeded/);
		});

		it('runs through create, public page, files, duplicate and delete', async () => {
			const usedBefore = await usedPages();
			const content = await PAGE_TYPE_FIXTURES[type](upload(accessTokenPro));
			const created = await createQrCodeRequest(
				testServer,
				{ name: `contract ${type}`, config: QrCodeDefaults, content },
				accessTokenPro,
			);
			expect(created).toHaveStatusCode(201);
			const qrCode = JSON.parse(created.payload) as TQrCodeWithRelationsResponseDto;
			const shortCode = qrCode.shortUrl!.shortCode;
			expect(await usedPages()).toBe(usedBefore + 1);

			// every referenced file is owned by the page behind the code's short URL, with its role
			const repository = container.resolve(StoredFileRepository);
			const pageIdOf = async (code: TQrCodeWithRelationsResponseDto) =>
				(await container.resolve(ShortUrlRepository).findOneByShortCode(code.shortUrl!.shortCode))
					?.hostedPageId;
			const pageId = await pageIdOf(qrCode);
			expect(pageId).toBeTruthy();
			for (const ref of getHostedFileRefs(qrCode.content)) {
				const row = await repository.findByFileKey(ref.key);
				expect(row?.ownerType).toBe('hosted_page');
				expect(row?.ownerId).toBe(pageId);
				expect(row?.slot).toBe(ref.slot);
				expect(row?.itemId ?? undefined).toBe(ref.documentId);
			}

			// the public page has the right type and every served file can be opened
			const page = await testServer.inject({
				method: 'GET',
				url: `${HOSTED_API_PATH}/by-code/${shortCode}`,
			});
			expect(page).toHaveStatusCode(200);
			expect((JSON.parse(page.payload) as TPublicHostedPageResponseDto).type).toBe(type);
			for (const file of getHostedServedFiles(qrCode.content)) {
				const response = await testServer.inject({
					method: 'GET',
					url: `${HOSTED_API_PATH}/by-code/${shortCode}/files/${file.documentId}`,
					headers: {
						'x-internal-api-key': env.INTERNAL_API_SECRET,
						'x-hosted-host': new URL(buildShortUrl(shortCode)).host,
					},
				});
				expect(response).toHaveStatusCode(200);
				const stored = await container.resolve(StoredFileRepository).findByFileKey(file.fileKey);
				expect(response.headers['content-type']).toContain(stored!.contentType);
			}

			// a duplicate gets its own copies of every file
			const duplicate = await testServer.inject({
				method: 'POST',
				url: `${QR_CODE_API_PATH}/${qrCode.id}/duplicate`,
				headers: auth(accessTokenPro),
			});
			expect(duplicate).toHaveStatusCode(201);
			const copy = JSON.parse(duplicate.payload) as TQrCodeWithRelationsResponseDto;
			const sourceKeys = new Set(getHostedFileRefs(qrCode.content).map((ref) => ref.key));
			const copyPageId = await pageIdOf(copy);
			expect(copyPageId).not.toBe(pageId);
			for (const ref of getHostedFileRefs(copy.content)) {
				expect(sourceKeys.has(ref.key)).toBe(false);
				expect((await repository.findByFileKey(ref.key))?.ownerId).toBe(copyPageId);
			}

			// deleting releases the files with a purge date instead of deleting them on the spot
			for (const id of [qrCode.id, copy.id]) {
				const deleted = await testServer.inject({
					method: 'DELETE',
					url: `${QR_CODE_API_PATH}/${id}`,
					headers: auth(accessTokenPro),
				});
				expect(deleted).toHaveStatusCode(200);
			}
			for (const ref of getHostedFileRefs(qrCode.content)) {
				const row = await repository.findByFileKey(ref.key);
				expect(row?.releasedAt).toBeTruthy();
				expect(row?.purgeAfter).toBeTruthy();
			}
			expect(await usedPages()).toBe(usedBefore);
		});
	});
});
