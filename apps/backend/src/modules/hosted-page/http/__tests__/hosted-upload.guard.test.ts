import { Writable } from 'node:stream';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getAuth } from '@clerk/fastify';
import { resolveUserPlan } from '@/core/http/middleware/add-user-to-request.middleware';
import {
	holdingUploadSlot,
	hostedUploadGuard,
	MAX_UPLOAD_BYTES_PER_PROCESS,
	MAX_UPLOADS_PER_USER,
	uploadsInFlight,
} from '../hosted-upload.guard';
import { HOSTED_UPLOAD_HARD_LIMIT_BYTES } from '../../config/constants';

jest.mock('@clerk/fastify', () => ({ getAuth: jest.fn() }));
jest.mock('@/core/http/middleware/add-user-to-request.middleware', () => ({
	resolveUserPlan: jest.fn(),
}));

const mockedGetAuth = getAuth as jest.Mock;
const mockedPlan = resolveUserPlan as jest.Mock;

/** A request as the guard sees it in onRequest: headers only, the body not read yet. */
const call = (length: string | null = '1000') => {
	const request = {
		headers: length === null ? {} : { 'content-length': length },
		raw: {},
	} as unknown as FastifyRequest;
	const response = new Writable({ write: (_chunk, _encoding, done) => done() });
	const reply = { raw: response } as unknown as FastifyReply;
	return { request, response, run: () => hostedUploadGuard(request, reply) };
};

const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('hostedUploadGuard', () => {
	beforeEach(() => {
		mockedGetAuth.mockReturnValue({ userId: 'user_guard' });
		mockedPlan.mockResolvedValue('pro');
	});

	it('refuses before the body is read: no length, too large, anonymous, a plan without uploads', async () => {
		await expect(call(null).run()).rejects.toMatchObject({ statusCode: 411 });
		await expect(call(String(1024 * 1024 * 1024)).run()).rejects.toMatchObject({
			statusCode: 413,
		});

		mockedGetAuth.mockReturnValueOnce({ userId: null });
		await expect(call().run()).rejects.toMatchObject({ statusCode: 401 });

		mockedPlan.mockResolvedValueOnce('free');
		await expect(call().run()).rejects.toMatchObject({ statusCode: 403 });
		expect(uploadsInFlight().total).toBe(0);
	});

	it('limits uploads per user and frees a slot when its response ends', async () => {
		const running = Array.from({ length: MAX_UPLOADS_PER_USER }, () => call());
		for (const upload of running) await upload.run();
		await expect(call().run()).rejects.toMatchObject({ statusCode: 429 });

		running[0].response.end();
		await settle();
		await expect(call().run()).resolves.toBeUndefined();

		for (const upload of running) upload.response.destroy();
		await settle();
		expect(uploadsInFlight().total).toBe(1);
	});

	it('caps the bytes a process holds, across users', async () => {
		const before = uploadsInFlight().bytes;
		const largest = String(HOSTED_UPLOAD_HARD_LIMIT_BYTES);
		const fitting = Math.floor(
			(MAX_UPLOAD_BYTES_PER_PROCESS - before) / HOSTED_UPLOAD_HARD_LIMIT_BYTES,
		);
		const running = [];
		for (let user = 0; user < fitting; user++) {
			mockedGetAuth.mockReturnValueOnce({ userId: `user_bytes_${user}` });
			const upload = call(largest);
			await upload.run();
			running.push(upload);
		}
		mockedGetAuth.mockReturnValueOnce({ userId: 'user_bytes_last' });
		await expect(call(largest).run()).rejects.toMatchObject({ statusCode: 429 });

		for (const upload of running) upload.response.end();
		await settle();
		expect(uploadsInFlight().bytes).toBe(before);
	});

	it('frees the slot of a request whose connection was already gone', async () => {
		const before = uploadsInFlight().total;
		const upload = call();
		upload.response.destroy();
		await upload.run();
		await settle();
		expect(uploadsInFlight().total).toBe(before);
	});

	it('keeps the slot while the handler still holds the file, even when the client left', async () => {
		const before = uploadsInFlight().total;
		const upload = call();
		await upload.run();

		let finish!: () => void;
		const work = holdingUploadSlot(upload.request, () => new Promise<void>((r) => (finish = r)));
		upload.response.destroy();
		await settle();
		expect(uploadsInFlight().total).toBe(before + 1);

		finish();
		await work;
		expect(uploadsInFlight().total).toBe(before);
	});
});
