import { inject, singleton } from 'tsyringe';
import Stripe from 'stripe';
import { env } from '@/core/config/env';
import { Logger } from '@/core/logging';
import { trackExternal } from '@/core/metrics';

/** The live Stripe facts a quantity change is decided on. */
export type TAddonSubscriptionState = {
	subscriptionId: string;
	itemId: string;
	priceId: string;
	quantity: number;
	currency: string;
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	cancelAtPeriodEnd: boolean;
	/** Set while a deferred change is parked on the subscription. */
	scheduleId: string | null;
	interval: Stripe.Price.Recurring.Interval;
	intervalCount: number;
};

/**
 * A proration date Stripe will accept for this subscription item.
 *
 * Stripe rejects anything outside the item's current period ("Cannot specify proration date
 * outside of current subscription period or current phase"). Wall-clock time is normally inside
 * it, but not always: a subscription driven by a test clock lives in a different present
 * entirely, and clock skew can push a real one out by seconds. Clamping keeps the quote valid
 * and, under a test clock, prorates from the period it is actually in.
 */
function prorationDateWithin(item: Stripe.SubscriptionItem): number {
	const now = Math.floor(Date.now() / 1000);
	return Math.min(Math.max(now, item.current_period_start), item.current_period_end);
}

/**
 * The phase that takes over when the current one ends, if the schedule still has one.
 *
 * Matches on the current phase's end date rather than a fixed index: a schedule created in the
 * Stripe portal need not put the upcoming phase at position 1, and after one phase transition
 * index 0 is history.
 */
export function readUpcomingPhase(
	schedule: Stripe.SubscriptionSchedule,
): { quantity: number; effectiveAt: Date } | null {
	if (schedule.status !== 'active' && schedule.status !== 'not_started') return null;

	const currentEnd = schedule.current_phase?.end_date;
	const upcoming = currentEnd
		? schedule.phases.find((phase) => phase.start_date === currentEnd)
		: schedule.phases[0];

	const quantity = upcoming?.items[0]?.quantity;
	if (!upcoming || quantity === undefined || quantity === null) return null;

	return { quantity, effectiveAt: new Date(upcoming.start_date * 1000) };
}

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
	 * Raises the seat count on a single-item subscription and invoices the difference now.
	 *
	 * Only ever used for increases. A reduction must not touch the subscription at all — see
	 * {@link scheduleQuantityAtPeriodEnd}, which defers it so the customer keeps what they paid
	 * for and never receives a credit.
	 */
	async updateSubscriptionQuantity(params: {
		subscriptionId: string;
		quantity: number;
		/** Pass the value from a preview so the charge matches the quoted amount to the cent. */
		prorationDate?: number;
	}): Promise<{ subscription: Stripe.Subscription; paymentPending: boolean }> {
		const item = await this.getFirstItem(params.subscriptionId);

		const subscription = await trackExternal('stripe', 'subscriptions.update', () =>
			this.stripe.subscriptions.update(params.subscriptionId, {
				items: [{ id: item.id, quantity: params.quantity }],
				// Collect the difference for the rest of the period straight away, so the slots are
				// usable the moment the payment goes through.
				proration_behavior: 'always_invoice',
				// Without this Stripe applies the change even when the card declines and simply
				// moves the subscription to past_due — the customer would hold slots they never
				// paid for. `pending_if_incomplete` parks the change until the invoice is paid.
				payment_behavior: 'pending_if_incomplete',
				// Clamped as well: the quote may have been taken before a renewal rolled the
				// period over, and Stripe would reject the now out-of-range date.
				...(params.prorationDate
					? {
							proration_date: Math.min(
								Math.max(params.prorationDate, item.current_period_start),
								item.current_period_end,
							),
						}
					: {}),
			}),
		);

		return { subscription, paymentPending: !!subscription.pending_update };
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

		const prorationDate = prorationDateWithin(item);
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

	/**
	 * Everything a quantity change has to decide on, read from Stripe in one call.
	 *
	 * The quantity in particular must come from here and never from the local mirror: it is what
	 * the customer is being billed for right now, and a stale value written into a schedule phase
	 * would change the running subscription instead of the next one.
	 */
	async getAddonSubscriptionState(subscriptionId: string): Promise<TAddonSubscriptionState> {
		const subscription = await this.getSubscription(subscriptionId);
		const item = subscription.items.data[0];
		if (!item) {
			throw new Error(`Stripe subscription ${subscriptionId} has no line items`);
		}

		const recurring = item.price.recurring;
		if (!recurring) {
			throw new Error(`Stripe price ${item.price.id} is not recurring`);
		}

		return {
			subscriptionId: subscription.id,
			itemId: item.id,
			priceId: item.price.id,
			quantity: item.quantity ?? 1,
			currency: subscription.currency,
			currentPeriodStart: new Date(item.current_period_start * 1000),
			currentPeriodEnd: new Date(item.current_period_end * 1000),
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			scheduleId:
				typeof subscription.schedule === 'string'
					? subscription.schedule
					: (subscription.schedule?.id ?? null),
			interval: recurring.interval,
			intervalCount: recurring.interval_count,
		};
	}

	/**
	 * Parks a lower quantity so it takes effect when the paid period ends.
	 *
	 * Reductions must never touch the running subscription — the customer paid to the end of the
	 * term and no credit is ever issued. A subscription schedule is the only mechanism that
	 * actually defers a quantity: `proration_behavior: 'none'` alone would apply the change now
	 * and merely suppress the invoice line.
	 *
	 * Any existing schedule is released and rebuilt rather than patched. `from_subscription`
	 * derives the current phase from live Stripe state, so the phase boundaries are right by
	 * construction; patching in place would have to guess which index the running phase sits at,
	 * which stops being 0 as soon as one reduction has already taken effect.
	 */
	async scheduleQuantityAtPeriodEnd(params: {
		state: TAddonSubscriptionState;
		quantity: number;
	}): Promise<{ scheduleId: string; effectiveAt: Date }> {
		const { state, quantity } = params;

		if (state.scheduleId) {
			await this.releaseSchedule(state.scheduleId);
		}

		const created = await trackExternal('stripe', 'subscriptionSchedules.create', () =>
			this.stripe.subscriptionSchedules.create({ from_subscription: state.subscriptionId }),
		);

		const currentPhase = created.phases[0];
		if (!currentPhase) {
			throw new Error(`Stripe schedule ${created.id} was created without a current phase`);
		}

		const schedule = await trackExternal('stripe', 'subscriptionSchedules.update', () =>
			this.stripe.subscriptionSchedules.update(created.id, {
				// Hand the subscription back once the reduced phase has run, so the next change
				// starts from a plain subscription again.
				end_behavior: 'release',
				// Both levels default to `create_prorations`, which does not invoice but parks
				// credit line items that surface on the next invoice. That would hand out the
				// refund the product rule forbids, a month later and invisibly until then.
				proration_behavior: 'none',
				phases: [
					{
						items: [{ price: state.priceId, quantity: state.quantity }],
						start_date: currentPhase.start_date,
						end_date: currentPhase.end_date,
						proration_behavior: 'none',
					},
					{
						items: [{ price: state.priceId, quantity }],
						// The SDK has no `iterations` on update params; `duration` has to mirror the
						// price's own cadence or the annual add-on would renew as monthly.
						duration: { interval: state.interval, interval_count: state.intervalCount },
						proration_behavior: 'none',
					},
				],
			}),
		);

		const effectiveAt = schedule.phases[1]?.start_date ?? currentPhase.end_date;

		this.logger.info('stripe.schedule.quantityDeferred', {
			stripe: {
				subscriptionId: state.subscriptionId,
				scheduleId: schedule.id,
				from: state.quantity,
				to: quantity,
			},
		});

		return { scheduleId: schedule.id, effectiveAt: new Date(effectiveAt * 1000) };
	}

	/**
	 * Detaches a schedule, leaving the subscription itself untouched.
	 *
	 * Tolerates a schedule that is already gone or has moved past `active`: releasing races with
	 * Stripe completing the schedule on its own, and losing that race must not fail the request
	 * the user made.
	 */
	async releaseSchedule(scheduleId: string): Promise<void> {
		try {
			await trackExternal('stripe', 'subscriptionSchedules.release', () =>
				this.stripe.subscriptionSchedules.release(scheduleId),
			);
		} catch (error) {
			if (!this.isBenignScheduleError(error)) throw error;

			this.logger.info('stripe.schedule.releaseSkipped', {
				stripe: { scheduleId, reason: (error as Stripe.errors.StripeError).message },
			});
		}
	}

	/** The quantity the phase after the current one will switch to, if there is one. */
	async getScheduledQuantity(
		scheduleId: string,
	): Promise<{ quantity: number; effectiveAt: Date } | null> {
		const schedule = await trackExternal('stripe', 'subscriptionSchedules.retrieve', () =>
			this.stripe.subscriptionSchedules.retrieve(scheduleId),
		);

		return readUpcomingPhase(schedule);
	}

	private isBenignScheduleError(error: unknown): boolean {
		if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) return false;
		return error.code === 'resource_missing' || /can only be released/i.test(error.message);
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

	/**
	 * Every subscription a customer holds, in any status.
	 *
	 * Reconciliation has to go through the customer rather than the global
	 * {@link listActiveSubscriptions}: Stripe omits objects bound to a test clock from unscoped
	 * list results, so a whole staging setup would be invisible to the sweep. Scoping by customer
	 * returns them, and `status: 'all'` also surfaces a re-purchase made after a cancellation.
	 */
	async listSubscriptionsForCustomer(customerId: string): Promise<Stripe.Subscription[]> {
		return trackExternal('stripe', 'subscriptions.list', async () => {
			const subscriptions: Stripe.Subscription[] = [];
			for await (const sub of this.stripe.subscriptions.list({
				customer: customerId,
				status: 'all',
				limit: 100,
			})) {
				subscriptions.push(sub);
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
