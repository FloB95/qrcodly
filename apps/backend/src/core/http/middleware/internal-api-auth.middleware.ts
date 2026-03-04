import crypto from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@/core/error/http';
import { env } from '@/core/config/env';

export function internalApiAuthHandler(request: FastifyRequest, _reply: unknown, done: () => void) {
	const apiKey = request.headers['x-internal-api-key'] as string | undefined;

	if (!apiKey) {
		throw new UnauthorizedError('Missing internal API key');
	}

	const expected = Buffer.from(env.INTERNAL_API_SECRET);
	const received = Buffer.from(apiKey);

	if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
		throw new UnauthorizedError('Invalid internal API key');
	}

	done();
}
