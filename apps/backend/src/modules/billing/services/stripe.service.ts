import { inject, singleton } from 'tsyringe';
import Stripe from 'stripe';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';

@singleton()
export class StripeService {
	private stripe: Stripe;

	constructor(@inject(Logger) private readonly logger: Logger) {
		this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
	}

	async findOrCreateCustomer(
		userId: string,
		email: string,
		name?: string,
	): Promise<Stripe.Customer> {
		// Search for existing customer by metadata
		const existing = await this.stripe.customers.search({
			query: `metadata["clerkUserId"]:"${userId}"`,
		});

		const first = existing.data[0];
		if (first) {
			return first;
		}

		// Create new customer
		const customer = await this.stripe.customers.create({
			email,
			name: name || undefined,
			metadata: { clerkUserId: userId },
		});

		this.logger.info('stripe.customer.created', {
			stripe: { customerId: customer.id, userId },
		});

		return customer;
	}

	async createCheckoutSession(params: {
		customerId: string;
		priceId: string;
		successUrl: string;
		cancelUrl: string;
		userId: string;
		locale?: string;
	}): Promise<Stripe.Checkout.Session> {
		return this.stripe.checkout.sessions.create({
			customer: params.customerId,
			mode: 'subscription',
			line_items: [{ price: params.priceId, quantity: 1 }],
			success_url: params.successUrl,
			cancel_url: params.cancelUrl,
			metadata: { clerkUserId: params.userId },
			locale: (params.locale as Stripe.Checkout.SessionCreateParams.Locale) || 'auto',
			billing_address_collection: 'auto',
			subscription_data: {
				metadata: { clerkUserId: params.userId },
			},
		});
	}

	async createPortalSession(
		stripeCustomerId: string,
		returnUrl: string,
		locale?: string,
	): Promise<Stripe.BillingPortal.Session> {
		return this.stripe.billingPortal.sessions.create({
			customer: stripeCustomerId,
			return_url: returnUrl,
			locale: (locale as Stripe.BillingPortal.SessionCreateParams.Locale) || 'auto',
		});
	}

	constructWebhookEvent(body: string | Buffer, signature: string): Stripe.Event {
		return this.stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
	}

	async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
		return this.stripe.subscriptions.retrieve(subscriptionId);
	}

	async listActiveSubscriptions(): Promise<Stripe.Subscription[]> {
		const subscriptions: Stripe.Subscription[] = [];
		for (const status of ['active', 'trialing', 'past_due'] as const) {
			for await (const sub of this.stripe.subscriptions.list({
				status,
				limit: 100,
			})) {
				subscriptions.push(sub);
			}
		}
		return subscriptions;
	}

	async listRecentCheckoutSessions(createdAfter: number): Promise<Stripe.Checkout.Session[]> {
		const sessions: Stripe.Checkout.Session[] = [];
		for await (const session of this.stripe.checkout.sessions.list({
			status: 'complete',
			created: { gte: createdAfter },
			expand: ['data.subscription'],
			limit: 100,
		})) {
			sessions.push(session);
		}
		return sessions;
	}
}
