import type { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { QrCodeDefaults, type TRenderQrCodeDto } from '@shared/schemas';
import { QR_CODE_API_PATH, getTestContext } from './utils';
import { resetTestState } from '@/tests/shared/test-context';
import { KeyCache } from '@/core/cache/key-cache';
import { RenderQrCodeUseCase } from '../../useCase/render-qr-code.use-case';

describe('renderQrCode', () => {
	let testServer: FastifyInstance;
	let accessToken: string;

	beforeAll(async () => {
		await resetTestState();
		const ctx = await getTestContext();
		testServer = ctx.testServer;
		accessToken = ctx.accessToken;
	});

	const render = async (body: Partial<TRenderQrCodeDto>, token = accessToken) =>
		testServer.inject({
			method: 'POST',
			url: `${QR_CODE_API_PATH}/render`,
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			payload: {
				config: QrCodeDefaults,
				data: 'https://qrcodly.de',
				...body,
			},
		});

	it('returns 401 without authentication', async () => {
		const response = await testServer.inject({
			method: 'POST',
			url: `${QR_CODE_API_PATH}/render`,
			payload: { config: QrCodeDefaults, data: 'x' },
		});
		expect(response).toHaveStatusCode(401);
	});

	it('renders a PNG by default', async () => {
		const response = await render({});
		expect(response).toHaveStatusCode(200);
		expect(response.headers['content-type']).toBe('image/png');
		expect(response.headers['etag']).toMatch(/^"[a-f0-9]{16}"$/);
		const body = response.rawPayload;
		expect(body.length).toBeGreaterThan(100);
		expect(body.slice(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
	});

	it('renders SVG when format=svg', async () => {
		const response = await render({ format: 'svg' });
		expect(response).toHaveStatusCode(200);
		expect(response.headers['content-type']).toBe('image/svg+xml');
		expect(response.rawPayload.toString('utf8')).toMatch(/<svg/);
	});

	it('renders WebP when format=webp', async () => {
		const response = await render({ format: 'webp' });
		expect(response).toHaveStatusCode(200);
		expect(response.headers['content-type']).toBe('image/webp');
		// WebP files start with "RIFF....WEBP"
		const head = response.rawPayload.slice(0, 4).toString('ascii');
		expect(head).toBe('RIFF');
	});

	it('renders JPEG when format=jpeg', async () => {
		const response = await render({ format: 'jpeg' });
		expect(response).toHaveStatusCode(200);
		expect(response.headers['content-type']).toBe('image/jpeg');
		// JPEG magic: FF D8 FF
		expect(response.rawPayload[0]).toBe(0xff);
		expect(response.rawPayload[1]).toBe(0xd8);
	});

	it('respects sizePx', async () => {
		const small = await render({ sizePx: 64 });
		const large = await render({ sizePx: 512 });
		expect(small.rawPayload.length).toBeLessThan(large.rawPayload.length);
	});

	it('returns 304 when If-None-Match matches the ETag', async () => {
		const first = await render({ data: 'https://etag.example' });
		expect(first).toHaveStatusCode(200);
		const etag = first.headers['etag'] as string;
		expect(etag).toBeTruthy();

		const second = await testServer.inject({
			method: 'POST',
			url: `${QR_CODE_API_PATH}/render`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'If-None-Match': etag,
			},
			payload: { config: QrCodeDefaults, data: 'https://etag.example' },
		});
		expect(second).toHaveStatusCode(304);
		expect(second.rawPayload.length).toBe(0);
	});

	it('rejects invalid format', async () => {
		const response = await render({ format: 'gif' as unknown as 'png' });
		expect(response).toHaveStatusCode(400);
	});

	it('rejects empty data', async () => {
		const response = await render({ data: '' });
		expect(response).toHaveStatusCode(400);
	});

	it('rejects oversized sizePx', async () => {
		const response = await render({ sizePx: 4097 });
		expect(response).toHaveStatusCode(400);
	});

	it('rejects data beyond 4000 chars', async () => {
		const response = await render({ data: 'x'.repeat(4001) });
		expect(response).toHaveStatusCode(400);
	});

	it('writes the rendered buffer to Redis under the etag key', async () => {
		const cache = container.resolve(KeyCache);
		await cache.flushAllCache();

		const response = await render({ data: 'https://cache-write.example' });
		expect(response).toHaveStatusCode(200);
		const etag = response.headers['etag'] as string;

		const cached = await cache.getBuffer(`qr_render:${etag}`);
		expect(cached).not.toBeNull();
		expect(cached!.length).toBe(response.rawPayload.length);
	});

	it('serves the second identical request from cache without re-rendering', async () => {
		const cache = container.resolve(KeyCache);
		await cache.flushAllCache();
		// UseCase is transient — spy on the prototype so any instance is observed.
		const renderSpy = jest.spyOn(
			RenderQrCodeUseCase.prototype as unknown as {
				renderBuffer: (...args: unknown[]) => Promise<Buffer>;
			},
			'renderBuffer',
		);

		try {
			const first = await render({ data: 'https://cache-hit.example' });
			expect(first).toHaveStatusCode(200);
			expect(renderSpy).toHaveBeenCalledTimes(1);

			const second = await render({ data: 'https://cache-hit.example' });
			expect(second).toHaveStatusCode(200);
			expect(renderSpy).toHaveBeenCalledTimes(1);
			expect(second.rawPayload).toEqual(first.rawPayload);
			expect(second.headers['etag']).toBe(first.headers['etag']);
		} finally {
			renderSpy.mockRestore();
		}
	});

	it('does not invoke the use case when If-None-Match matches', async () => {
		const first = await render({ data: 'https://etag-skip.example' });
		const etag = first.headers['etag'] as string;

		const executeSpy = jest.spyOn(RenderQrCodeUseCase.prototype, 'execute');

		try {
			const second = await testServer.inject({
				method: 'POST',
				url: `${QR_CODE_API_PATH}/render`,
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
					'If-None-Match': etag,
				},
				payload: { config: QrCodeDefaults, data: 'https://etag-skip.example' },
			});
			expect(second).toHaveStatusCode(304);
			expect(executeSpy).not.toHaveBeenCalled();
		} finally {
			executeSpy.mockRestore();
		}
	});

	it('produces a different etag when the config changes', async () => {
		const a = await render({ data: 'https://config-change.example' });
		const b = await render({
			data: 'https://config-change.example',
			config: {
				...QrCodeDefaults,
				dotsOptions: {
					...QrCodeDefaults.dotsOptions,
					style: { type: 'hex', value: '#ff0000' },
				},
			},
		});
		expect(a).toHaveStatusCode(200);
		expect(b).toHaveStatusCode(200);
		expect(a.headers['etag']).not.toBe(b.headers['etag']);
	});
});
