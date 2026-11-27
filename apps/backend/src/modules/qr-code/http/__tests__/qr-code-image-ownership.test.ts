import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { QrCodeDefaults, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import db from '@/core/db';
import { qrCode } from '@/core/db/schemas';
import { API_BASE_PATH } from '@/core/config/constants';
import { ObjectStorage } from '@/core/storage';
import { getTestContext, resetTestState } from '@/tests/shared/test-context';
import { createQrCodeRequest, generateQrCodeDto } from './utils';

const QR_CODE_API_PATH = `${API_BASE_PATH}/qr-code`;
const LOGO =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/**
 * A QR code only ever deletes the logo that was stored for it. The logo of a QR code is a path
 * in its config, and a client can send any path there.
 */
describe('QR code logo ownership', () => {
	let testServer: FastifyInstance;
	let owner: string;
	let other: string;

	const create = async (token: string, image: string) => {
		const response = await createQrCodeRequest(
			testServer,
			{ ...generateQrCodeDto(), config: { ...QrCodeDefaults, image } },
			token,
		);
		expect(response).toHaveStatusCode(201);
		return (JSON.parse(response.payload) as TQrCodeWithRelationsResponseDto).id;
	};

	const remove = (id: string, token: string) =>
		testServer.inject({
			method: 'DELETE',
			url: `${QR_CODE_API_PATH}/${id}`,
			headers: { Authorization: `Bearer ${token}` },
		});

	const replaceLogo = (id: string, token: string) =>
		testServer.inject({
			method: 'PATCH',
			url: `${QR_CODE_API_PATH}/${id}`,
			payload: { config: { ...QrCodeDefaults, image: LOGO } },
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		});

	/** The storage path of the logo, as the database has it. */
	const storedLogoOf = async (id: string) => {
		const [row] = await db.select().from(qrCode).where(eq(qrCode.id, id));
		const path = row?.config.image;
		if (!path) throw new Error('QR code has no stored logo');
		return path;
	};

	/** The storage answers a missing file with an error. */
	const isStored = (path: string) =>
		container
			.resolve(ObjectStorage)
			.public.get(path)
			.then(
				(file) => file !== null,
				() => false,
			);

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		owner = ctx.accessToken;
		other = ctx.accessToken2;
	});

	it('keeps the logo of another account when a QR code that points at it is deleted', async () => {
		const logo = await storedLogoOf(await create(owner, LOGO));
		const pointing = await create(other, logo);

		expect(await remove(pointing, other)).toHaveStatusCode(200);

		expect(await isStored(logo)).toBe(true);
	});

	it('keeps the logo of another account when a QR code that points at it gets a new logo', async () => {
		const logo = await storedLogoOf(await create(owner, LOGO));
		const pointing = await create(other, logo);

		expect(await replaceLogo(pointing, other)).toHaveStatusCode(200);

		expect(await isStored(logo)).toBe(true);
	});

	it('keeps the logo of another own QR code, too', async () => {
		const logo = await storedLogoOf(await create(owner, LOGO));
		const pointing = await create(owner, logo);

		expect(await remove(pointing, owner)).toHaveStatusCode(200);

		expect(await isStored(logo)).toBe(true);
	});

	it('still removes its own logo when a QR code is deleted', async () => {
		const id = await create(owner, LOGO);
		const logo = await storedLogoOf(id);

		expect(await remove(id, owner)).toHaveStatusCode(200);

		expect(await isStored(logo)).toBe(false);
	});

	it('still removes its previous logo when a QR code gets a new one', async () => {
		const id = await create(owner, LOGO);
		const previous = await storedLogoOf(id);

		expect(await replaceLogo(id, owner)).toHaveStatusCode(200);

		expect(await isStored(previous)).toBe(false);
		expect(await isStored(await storedLogoOf(id))).toBe(true);
	});
});
