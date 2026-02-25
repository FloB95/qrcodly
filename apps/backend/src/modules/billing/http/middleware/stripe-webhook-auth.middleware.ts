import type { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@/core/error/http';
import { container } from 'tsyringe';
import { Logger } from '@/core/logging';
import { createRequestLogObject } from '@/libs/fastify/helpers';
import { StripeService } from '../../services/stripe.service';

export function stripeWebhookAuthHandler(
	request: FastifyRequest,
	_reply: unknown,
	done: () => void,
) {
	const logger = container.resolve(Logger);
	try {
		const signature = request.headers['stripe-signature'] as string;
		if (!signature) {
			throw new UnauthorizedError('Missing stripe-signature header');
		}

		if (!request.body) {
			throw new UnauthorizedError('Missing payload');
		}

		// The Stripe webhook route is registered in an encapsulated Fastify scope
		// that keeps the body as a raw string (required for HMAC signature verification).
		const stripeService = container.resolve(StripeService);
		const event = stripeService.constructWebhookEvent(request.body as string, signature);

		logger.info('stripe.webhook.verified', {
			request: createRequestLogObject(request),
			stripe: { eventType: event.type, eventId: event.id },
		});

		// @ts-expect-error - attaching verified event to request
		request.stripeEvent = event;

		done();
	} catch (e) {
		const error = e as Error;
		logger.error('stripe.webhook.auth.error', {
			request: createRequestLogObject(request),
			error,
		});
		throw new UnauthorizedError('Invalid webhook signature');
	}
}
