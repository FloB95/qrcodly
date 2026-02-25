import { Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { inject, injectable } from 'tsyringe';
import { stripeWebhookAuthHandler } from '../middleware/stripe-webhook-auth.middleware';
import { type FastifyRequest } from 'fastify';
import { StripeWebhookService } from '../../services/stripe-webhook.service';

@injectable()
export class StripeWebhookController extends AbstractController {
	constructor(@inject(StripeWebhookService) private readonly webhookService: StripeWebhookService) {
		super();
	}

	@Post('/webhook/stripe', { schema: { hide: true }, authHandler: stripeWebhookAuthHandler })
	async handleWebhook(request: FastifyRequest) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		await this.webhookService.handleWebhookEvent((request as any).stripeEvent);
		return this.makeApiHttpResponse(200, { status: 'ok' });
	}
}
