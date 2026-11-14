import type { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { container } from 'tsyringe';
import {
	QrCodeDefaults,
	type THostedUploadResponseDto,
	type TProductInput,
	type TPublicHostedPageResponseDto,
	type TQrCodeWithRelationsResponseDto,
} from '@shared/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import { env } from '@/core/config/env';
import { resetTestState, TEST_USER_PRO_ID } from '@/tests/shared/test-context';
import {
	getTestContext as getBillingTestContext,
	createSubscriptionDirectly,
	cleanupCreatedSubscriptions,
	type TestContext as BillingTestContext,
} from '@/modules/billing/http/__tests__/utils';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import StoredFileRepository from '@/modules/stored-file/domain/repository/stored-file.repository';
import { createQrCodeRequest, getTestContext } from '@/modules/qr-code/http/__tests__/utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;
const HOSTED_API_PATH = `${API_BASE_PATH}/hosted-page`;

const MINIMAL_PDF = Buffer.from(
	'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

type TProductData = Omit<TProductInput, 'isDynamic'>;

describe('Hosted product pages', () => {
	let testServer: FastifyInstance;
	let accessTokenPro: string;
	let billingCtx: BillingTestContext;

	const authJson = () => ({
		Authorization: `Bearer ${accessTokenPro}`,
		'content-type': 'application/json',
	});

	const uploadPdf = async () => {
		const formData = new FormData();
		formData.append('kind', 'pdf');
		formData.append('file', MINIMAL_PDF, {
			filename: 'manual.pdf',
			contentType: 'application/pdf',
		});
		const response = await testServer.inject({
			method: 'POST',
			url: `${HOSTED_API_PATH}/upload`,
			payload: formData,
			headers: { Authorization: `Bearer ${accessTokenPro}`, ...formData.getHeaders() },
		});
		expect(response).toHaveStatusCode(201);
		return JSON.parse(response.payload) as THostedUploadResponseDto;
	};

	const file = (upload: THostedUploadResponseDto) => ({
		fileKey: upload.fileKey,
		fileName: upload.fileName,
		fileSize: upload.fileSize,
	});

	const productData = (
		upload: THostedUploadResponseDto,
		extra: Record<string, unknown> = {},
	): Record<string, unknown> => ({
		title: 'Bandsäge',
		model: 'BS-400',
		manufacturer: {
			name: 'Muster Maschinenbau GmbH',
			address: 'Musterstraße 1, 12345 Musterstadt',
			email: 'service@example.com',
		},
		documents: [{ category: 'manual', language: 'de', ...file(upload) }],
		...extra,
	});

	const create = (data: Record<string, unknown>) =>
		createQrCodeRequest(
			testServer,
			{ name: 'product', config: QrCodeDefaults, content: { type: 'product', data } } as never,
			accessTokenPro,
		);

	const createProduct = async (data: Record<string, unknown>) => {
		const response = await create(data);
		expect(response).toHaveStatusCode(201);
		return JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto;
	};

	const save = (id: string, data: Record<string, unknown>) =>
		testServer.inject({
			method: 'PATCH',
			url: `${QR_CODE_API_PATH}/${id}`,
			headers: authJson(),
			payload: { content: { type: 'product', data } },
		});

	const saveProduct = async (id: string, data: Record<string, unknown>) => {
		const response = await save(id, data);
		expect(response).toHaveStatusCode(200);
		return dataOf(JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto);
	};

	const dataOf = (qrCode: TQrCodeWithRelationsResponseDto): TProductData => {
		if (qrCode.content.type !== 'product') throw new Error('not a product page');
		return qrCode.content.data;
	};

	const fileRow = (fileKey: string) =>
		container.resolve(StoredFileRepository).findByFileKey(fileKey);

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessTokenPro = ctx.accessTokenPro;
		billingCtx = await getBillingTestContext();
		await createSubscriptionDirectly(billingCtx, TEST_USER_PRO_ID);
	});

	afterAll(async () => {
		await cleanupCreatedSubscriptions(billingCtx);
	});

	it('stamps a new document and starts without an archive', async () => {
		const data = dataOf(await createProduct(productData(await uploadPdf())));
		expect(data.documents[0].validFrom).toBeTruthy();
		expect(data.archive).toBeUndefined();
	});

	it('archives a replaced file, keeps serving it and leaves the rest untouched', async () => {
		const [first, datasheet, second] = [await uploadPdf(), await uploadPdf(), await uploadPdf()];
		const qrCode = await createProduct(
			productData(first, {
				documents: [
					{ category: 'manual', language: 'de', version: 'Rev. 1', ...file(first) },
					{ category: 'datasheet', language: 'de', ...file(datasheet) },
				],
			}),
		);
		const before = dataOf(qrCode);
		const [manual, sheet] = before.documents;

		const after = await saveProduct(qrCode.id, {
			...before,
			documents: [{ ...manual, version: 'Rev. 2', ...file(second) }, sheet],
		});

		expect(after.documents[0]).toMatchObject({ id: manual.id, fileKey: second.fileKey });
		expect(after.documents[0].validFrom).not.toBe(manual.validFrom ?? null);
		expect(after.documents[1].validFrom).toBe(sheet.validFrom);
		expect(after.archive).toHaveLength(1);
		const archived = after.archive![0];
		expect(archived).toMatchObject({
			documentId: manual.id,
			fileKey: first.fileKey,
			version: 'Rev. 1',
			validFrom: manual.validFrom,
		});
		expect(archived.validUntil).toBeTruthy();
		expect(archived.id).not.toBe(manual.id);

		// the old file stays a file of the page instead of being released
		const row = await fileRow(first.fileKey);
		expect(row).toMatchObject({ slot: 'archive', itemId: archived.id, releasedAt: null });

		const shortCode = qrCode.shortUrl!.shortCode;
		const served = await testServer.inject({
			method: 'GET',
			url: `${HOSTED_API_PATH}/by-code/${shortCode}/files/${archived.id}`,
			headers: {
				'x-internal-api-key': env.INTERNAL_API_SECRET,
				'x-hosted-host': new URL(buildShortUrl(shortCode)).host,
			},
		});
		expect(served).toHaveStatusCode(200);

		const page = JSON.parse(
			(await testServer.inject({ method: 'GET', url: `${HOSTED_API_PATH}/by-code/${shortCode}` }))
				.payload,
		) as TPublicHostedPageResponseDto;
		if (page.type !== 'product') throw new Error('not a product page');
		expect(page.model).toBe('BS-400');
		expect(page.archive).toHaveLength(1);
		expect(page.archive[0]).toMatchObject({ id: archived.id, documentId: manual.id });
	});

	it('archives the file of a removed document', async () => {
		const [manual, safety] = [await uploadPdf(), await uploadPdf()];
		const qrCode = await createProduct(
			productData(manual, {
				documents: [
					{ category: 'manual', language: 'de', ...file(manual) },
					{ category: 'safety', language: 'de', ...file(safety) },
				],
			}),
		);
		const before = dataOf(qrCode);

		const after = await saveProduct(qrCode.id, { ...before, documents: [before.documents[0]] });

		expect(after.documents).toHaveLength(1);
		expect(after.archive).toHaveLength(1);
		expect(after.archive![0]).toMatchObject({
			documentId: before.documents[1].id,
			category: 'safety',
			fileKey: safety.fileKey,
		});
	});

	it('takes no archive from the client and deletes entries only by id', async () => {
		const [first, second, foreign] = [await uploadPdf(), await uploadPdf(), await uploadPdf()];
		const qrCode = await createProduct(productData(first));
		const created = dataOf(qrCode);
		const replaced = await saveProduct(qrCode.id, {
			...created,
			documents: [{ ...created.documents[0], ...file(second) }],
		});
		const archived = replaced.archive![0];

		// an emptied or forged archive changes nothing
		const forged = await saveProduct(qrCode.id, {
			...replaced,
			title: 'Bandsäge 2',
			archive: [{ ...archived, id: 'forged', ...file(foreign) }],
		});
		expect(forged.archive).toEqual([archived]);
		expect((await fileRow(foreign.fileKey))?.ownerId).toBeNull();

		const removed = await saveProduct(qrCode.id, { ...forged, removeArchiveIds: [archived.id] });
		expect(removed.archive).toEqual([]);
		expect(removed).not.toHaveProperty('removeArchiveIds');
		const row = await fileRow(first.fileKey);
		expect(row?.releasedAt).toBeTruthy();
		expect(row?.purgeAfter).toBeTruthy();
	});

	it('starts a duplicate without the archive', async () => {
		const [first, second] = [await uploadPdf(), await uploadPdf()];
		const qrCode = await createProduct(productData(first));
		const created = dataOf(qrCode);
		await saveProduct(qrCode.id, {
			...created,
			documents: [{ ...created.documents[0], ...file(second) }],
		});

		const duplicate = await testServer.inject({
			method: 'POST',
			url: `${QR_CODE_API_PATH}/${qrCode.id}/duplicate`,
			headers: { Authorization: `Bearer ${accessTokenPro}` },
		});
		expect(duplicate).toHaveStatusCode(201);
		const copy = dataOf(JSON.parse(duplicate.payload) as TQrCodeWithRelationsResponseDto);
		expect(copy.documents).toHaveLength(1);
		expect(copy.documents[0].fileKey).not.toBe(second.fileKey);
		expect(copy.archive).toBeUndefined();
	});

	it('requires a digital contact and a recipient for paper requests', async () => {
		const upload = await uploadPdf();
		const withoutContact = await create(
			productData(upload, { manufacturer: { name: 'Muster GmbH', address: 'Musterstraße 1' } }),
		);
		expect(withoutContact).toHaveStatusCode(400);

		const withoutRecipient = await create(productData(upload, { paperRequest: { enabled: true } }));
		expect(withoutRecipient).toHaveStatusCode(400);

		const complete = await create(
			productData(upload, { paperRequest: { enabled: true, email: 'papier@example.com' } }),
		);
		expect(complete).toHaveStatusCode(201);
	});
});
