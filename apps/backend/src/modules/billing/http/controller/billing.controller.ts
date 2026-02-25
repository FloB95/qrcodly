import { Get, Post } from '@/core/decorators/route';
import AbstractController from '@/core/http/controller/abstract.controller';
import { inject, injectable } from 'tsyringe';
import { type IHttpRequest } from '@/core/interface/request.interface';
import { type IHttpResponse } from '@/core/interface/response.interface';
import { BadRequestError, NotFoundError } from '@/core/error/http';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import { StripeService } from '../../services/stripe.service';
import UserSubscriptionRepository from '../../domain/repository/user-subscription.repository';
import { createClerkClient } from '@clerk/fastify';
import { CreateCheckoutSessionDto } from '../../domain/dto/create-checkout-session.dto';
import { CreatePortalSessionDto } from '../../domain/dto/create-portal-session.dto';

const ALLOWED_PRICE_IDS = new Set([
	env.STRIPE_PRO_PRICE_ID_MONTHLY,
	env.STRIPE_PRO_PRICE_ID_ANNUAL,
]);

@injectable()
export class BillingController extends AbstractController {
	private clerkClient: ReturnType<typeof createClerkClient>;

	constructor(
		@inject(StripeService) private readonly stripeService: StripeService,
		@inject(UserSubscriptionRepository)
		private readonly userSubscriptionRepository: UserSubscriptionRepository,
		@inject(Logger) private readonly logger: Logger,
	) {
		super();
		this.clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
	}

	@Post('/checkout-session', { bodySchema: CreateCheckoutSessionDto, schema: { hide: true } })
	async createCheckoutSession(
		request: IHttpRequest<{
			priceId: string;
			locale?: string;
			successUrl?: string;
			cancelUrl?: string;
		}>,
	): Promise<IHttpResponse<{ url: string }>> {
		const { priceId, locale, successUrl, cancelUrl } = request.body;

		if (!priceId || !ALLOWED_PRICE_IDS.has(priceId)) {
			throw new BadRequestError('Invalid price ID');
		}

		const frontendOrigin = new URL(env.FRONTEND_URL).origin;
		const isAllowedRedirect = (url?: string) => {
			if (!url) return true;
			try {
				return new URL(url).origin === frontendOrigin;
			} catch {
				return false;
			}
		};
		if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
			throw new BadRequestError('Invalid redirect URL');
		}

		try {
			const user = await this.clerkClient.users.getUser(request.user.id);
			const email = user.emailAddresses[0]?.emailAddress ?? '';
			const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;

			const customer = await this.stripeService.findOrCreateCustomer(request.user.id, email, name);

			const session = await this.stripeService.createCheckoutSession({
				customerId: customer.id,
				priceId,
				successUrl: successUrl || `${env.FRONTEND_URL}/dashboard/settings/billing?checkout=success`,
				cancelUrl: cancelUrl || `${env.FRONTEND_URL}/plans`,
				userId: request.user.id,
				locale,
			});

			return this.makeApiHttpResponse(200, { url: session.url! });
		} catch (e) {
			const err = e instanceof Error ? e : new Error(String(e));
			this.logger.error('billing.checkout.error', {
				error: { message: err.message, stack: err.stack, name: err.name },
			});
			throw e;
		}
	}

	@Post('/portal-session', { bodySchema: CreatePortalSessionDto, schema: { hide: true } })
	async createPortalSession(
		request: IHttpRequest<{ locale?: string }>,
	): Promise<IHttpResponse<{ url: string }>> {
		const subscription = await this.userSubscriptionRepository.findByUserId(request.user.id);
		if (!subscription) {
			throw new NotFoundError('No subscription found');
		}

		const session = await this.stripeService.createPortalSession(
			subscription.stripeCustomerId,
			request.body.locale,
		);

		return this.makeApiHttpResponse(200, { url: session.url });
	}

	@Get('/subscription', { schema: { hide: true } })
	async getSubscription(request: IHttpRequest): Promise<
		IHttpResponse<{
			subscription: {
				status: string;
				stripePriceId: string;
				currentPeriodEnd: string;
				cancelAtPeriodEnd: boolean;
			} | null;
		}>
	> {
		const subscription = await this.userSubscriptionRepository.findByUserId(request.user.id);

		if (!subscription || subscription.status === 'canceled') {
			return this.makeApiHttpResponse(200, { subscription: null });
		}

		return this.makeApiHttpResponse(200, {
			subscription: {
				status: subscription.status,
				stripePriceId: subscription.stripePriceId,
				currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
				cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
			},
		});
	}
}
