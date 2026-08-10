import { inject, singleton } from 'tsyringe';
import Stripe from 'stripe';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import { trackExternal } from '@/core/metrics';

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
		const existing = await trackExternal('stripe', 'customers.search', () =>
			this.stripe.customers.search({
				query: `metadata["clerkUserId"]:"${userId}"`,
			}),
		);

		const first = existing.data[0];
		if (first) {
			return first;
		}

		// Create new customer
		const customer = await trackExternal('stripe', 'customers.create', () =>
			this.stripe.customers.create({
				email,
				name: name || undefined,
				metadata: { clerkUserId: userId },
			}),
		);

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
		quantity?: number;
		/**
		 * Copied onto both the session and the subscription. The subscription copy is what lets
		 * the webhook tell a Pro subscription from an add-on before it touches a table.
		 */
		metadata?: Record<string, string>;
	}): Promise<Stripe.Checkout.Session> {
		const metadata = { clerkUserId: params.userId, ...params.metadata };

		return trackExternal('stripe', 'checkout.sessions.create', () =>
			this.stripe.checkout.sessions.create({
				customer: params.customerId,
				mode: 'subscription',
				line_items: [{ price: params.priceId, quantity: params.quantity ?? 1 }],
				success_url: params.successUrl,
				cancel_url: params.cancelUrl,
				metadata,
				locale: (params.locale as Stripe.Checkout.SessionCreateParams.Locale) || 'auto',
				billing_address_collection: 'auto',
				subscription_data: { metadata },
			}),
		);
	}

	/**
	 * Changes the seat count on a single-item subscription.
	 *
	 * `billing: 'charge_now'` invoices the difference immediately, which is what an upgrade needs
	 * so the slots are usable straight away. `billing: 'defer'` writes the new quantity to Stripe
	 * without any proration, so the customer keeps what they paid for until the period ends and
	 * never receives a credit — the product rule is that nothing is ever refunded.
	 */
	async updateSubscriptionQuantity(params: {
		subscriptionId: string;
		quantity: number;
		billing: 'charge_now' | 'defer';
	}): Promise<Stripe.Subscription> {
		const subscription = await this.getSubscription(params.subscriptionId);
		const item = subscription.items.data[0];
		if (!item) {
			throw new Error(`Stripe subscription ${params.subscriptionId} has no line items`);
		}

		const chargeNow = params.billing === 'charge_now';
		const updated = await trackExternal('stripe', 'subscriptions.update', () =>
			this.stripe.subscriptions.update(params.subscriptionId, {
				items: [{ id: item.id, quantity: params.quantity }],
				proration_behavior: chargeNow ? 'always_invoice' : 'none',
				...(chargeNow ? { payment_behavior: 'error_if_incomplete' as const } : {}),
				expand: ['latest_invoice'],
			}),
		);

		if (chargeNow) this.assertProrationInvoiceSettled(updated);

		return updated;
	}

	async setCancelAtPeriodEnd(
		subscriptionId: string,
		cancelAtPeriodEnd: boolean,
	): Promise<Stripe.Subscription> {
		return trackExternal('stripe', 'subscriptions.update', () =>
			this.stripe.subscriptions.update(subscriptionId, {
				cancel_at_period_end: cancelAtPeriodEnd,
			}),
		);
	}

	/**
	 * `payment_behavior: 'error_if_incomplete'` is documented to reject an update it cannot
	 * collect, but its interaction with `always_invoice` is not something we want to rely on
	 * blindly — an unpaid invoice slipping through would grant slots the customer never paid for.
	 * Checking the invoice we just created is cheap and makes the outcome unambiguous.
	 */
	private assertProrationInvoiceSettled(subscription: Stripe.Subscription): void {
		const invoice = subscription.latest_invoice;
		if (!invoice || typeof invoice === 'string') return;
		if (invoice.status === 'open' || invoice.status === 'uncollectible') {
			throw new Error(
				`Stripe proration invoice ${invoice.id} for subscription ${subscription.id} is ${invoice.status}`,
			);
		}
	}

	async createPortalSession(
		stripeCustomerId: string,
		locale?: string,
	): Promise<Stripe.BillingPortal.Session> {
		return trackExternal('stripe', 'billingPortal.sessions.create', () =>
			this.stripe.billingPortal.sessions.create({
				customer: stripeCustomerId,
				locale: (locale as Stripe.BillingPortal.SessionCreateParams.Locale) || 'auto',
			}),
		);
	}

	constructWebhookEvent(body: string | Buffer, signature: string): Stripe.Event {
		return this.stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
	}

	async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
		return trackExternal('stripe', 'subscriptions.retrieve', () =>
			this.stripe.subscriptions.retrieve(subscriptionId),
		);
	}

	async listActiveSubscriptions(): Promise<Stripe.Subscription[]> {
		// One span per status, not per auto-paginated page — the whole sweep is the unit of work.
		return trackExternal('stripe', 'subscriptions.list', async () => {
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
		});
	}

	async listRecentCheckoutSessions(createdAfter: number): Promise<Stripe.Checkout.Session[]> {
		return trackExternal('stripe', 'checkout.sessions.list', async () => {
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
		});
	}
}
