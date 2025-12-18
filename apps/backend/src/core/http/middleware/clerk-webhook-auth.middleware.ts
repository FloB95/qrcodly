/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Webhook } from 'svix';
import type { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@/core/error/http';
import { env } from '@/core/config/env';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';

export function clerkWebhookAuthHandler(
	request: FastifyRequest,
	_reply: unknown,
	done: () => void,
) {
	const logger = container.resolve(Logger);
	try {
		const headers = request.headers;

		const svixId = headers['svix-id'] as string;
		const svixTimestamp = headers['svix-timestamp'] as string;
		const svixSignature = headers['svix-signature'] as string;

		if (!svixId || !svixTimestamp || !svixSignature) {
			throw new UnauthorizedError('Missing webhook headers');
		}

		const payload = request.body as JSON | undefined;
		if (!payload) {
			throw new UnauthorizedError('Missing payload');
		}

		const wh = new Webhook(env.CLERK_WEBHOOK_SECRET_KEY);
		const event = wh.verify(JSON.stringify(payload), {
			'svix-id': svixId,
			'svix-timestamp': svixTimestamp,
			'svix-signature': svixSignature,
		}) as any;

		logger.info('clerk.webhook.event', {
			eventType: event?.type,
		});

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		request.event = event;

		done();
	} catch (e) {
		const error = e as Error;
		logger.error('clerk.webhook.auth.error', {
			message: error.message,
		});
		throw new UnauthorizedError('Invalid webhook signature');
	}
}
