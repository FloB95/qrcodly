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
		/** Pass the value from a preview so the charge matches the quoted amount to the cent. */
		prorationDate?: number;
	}): Promise<{ subscription: Stripe.Subscription; paymentPending: boolean }> {
		const item = await this.getFirstItem(params.subscriptionId);
		const chargeNow = params.billing === 'charge_now';

		const subscription = await trackExternal('stripe', 'subscriptions.update', () =>
			this.stripe.subscriptions.update(params.subscriptionId, {
				items: [{ id: item.id, quantity: params.quantity }],
				proration_behavior: chargeNow ? 'always_invoice' : 'none',
				// Without this Stripe applies the change even when the card declines and simply
				// moves the subscription to past_due — the customer would hold slots they never
				// paid for. `pending_if_incomplete` parks the change until the invoice is paid.
				...(chargeNow
					? {
							payment_behavior: 'pending_if_incomplete' as const,
							...(params.prorationDate ? { proration_date: params.prorationDate } : {}),
						}
					: {}),
			}),
		);

		return { subscription, paymentPending: !!subscription.pending_update };
	}

	/**
	 * Sets the quantity without any financial effect.
	 *
	 * Used to put Stripe back on the quantity the customer has already paid for before charging an
	 * increase: while a reduction is pending, Stripe already holds the lower number, and prorating
	 * an increase from there would bill for slots that were paid for once already.
	 */
	async resetSubscriptionQuantity(
		subscriptionId: string,
		quantity: number,
	): Promise<Stripe.Subscription> {
		const item = await this.getFirstItem(subscriptionId);

		return trackExternal('stripe', 'subscriptions.update', () =>
			this.stripe.subscriptions.update(subscriptionId, {
				items: [{ id: item.id, quantity }],
				proration_behavior: 'none',
			}),
		);
	}

	/**
	 * What a quantity change would cost right now, without changing anything.
	 *
	 * Returns the `prorationDate` it was calculated at; feeding that back into the update keeps the
	 * charge identical to the quoted amount, since Stripe prorates to the second.
	 */
	async previewQuantityChange(params: {
		subscriptionId: string;
		quantity: number;
	}): Promise<{ amountDue: number; currency: string; prorationDate: number }> {
		const subscription = await this.getSubscription(params.subscriptionId);
		const item = subscription.items.data[0];
		if (!item) {
			throw new Error(`Stripe subscription ${params.subscriptionId} has no line items`);
		}

		const prorationDate = Math.floor(Date.now() / 1000);
		const customerId =
			typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

		const invoice = await trackExternal('stripe', 'invoices.createPreview', () =>
			this.stripe.invoices.createPreview({
				customer: customerId,
				subscription: params.subscriptionId,
				subscription_details: {
					items: [{ id: item.id, quantity: params.quantity }],
					proration_date: prorationDate,
					proration_behavior: 'always_invoice',
				},
			}),
		);

		return { amountDue: invoice.amount_due, currency: invoice.currency, prorationDate };
	}

	/** Card brand and last four digits of whatever Stripe would charge for this subscription. */
	async getSubscriptionPaymentMethod(
		subscriptionId: string,
	): Promise<{ brand: string; last4: string } | null> {
		const subscription = await trackExternal('stripe', 'subscriptions.retrieve', () =>
			this.stripe.subscriptions.retrieve(subscriptionId, {
				expand: ['default_payment_method', 'customer.invoice_settings.default_payment_method'],
			}),
		);

		const fromSubscription = subscription.default_payment_method;
		const customer = subscription.customer;
		const fromCustomer =
			typeof customer === 'object' && !('deleted' in customer && customer.deleted)
				? customer.invoice_settings?.default_payment_method
				: null;

		const paymentMethod = fromSubscription ?? fromCustomer;
		if (!paymentMethod || typeof paymentMethod === 'string' || !paymentMethod.card) return null;

		return { brand: paymentMethod.card.brand, last4: paymentMethod.card.last4 };
	}

	private async getFirstItem(subscriptionId: string): Promise<Stripe.SubscriptionItem> {
		const subscription = await this.getSubscription(subscriptionId);
		const item = subscription.items.data[0];
		if (!item) {
			throw new Error(`Stripe subscription ${subscriptionId} has no line items`);
		}
		return item;
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
