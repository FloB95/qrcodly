import { z } from 'zod';

/**
 * How many custom domains the user may currently have, broken down by source so the UI can say
 * "1 included with Pro + 3 extra" without re-deriving it.
 */
export const CustomDomainEntitlementDto = z.object({
	baseLimit: z.number().int(),
	addonSlots: z.number().int(),
	effectiveLimit: z.number().int(),
	usedDomains: z.number().int(),
});

export type TCustomDomainEntitlementDto = z.infer<typeof CustomDomainEntitlementDto>;

export const DomainAddonSubscriptionDto = z.object({
	status: z.string(),
	stripePriceId: z.string(),
	/** Slots in force right now. A pending reduction does not lower this until it takes effect. */
	quantity: z.number().int(),
	currentPeriodEnd: z.iso.datetime(),
	cancelAtPeriodEnd: z.boolean(),
	/** Lower slot count that takes over at the end of the paid period, if one is parked. */
	scheduledQuantity: z.number().int().nullable(),
	scheduledQuantityEffectiveAt: z.iso.datetime().nullable(),
});

export type TDomainAddonSubscriptionDto = z.infer<typeof DomainAddonSubscriptionDto>;

export const DomainAddonResponseDto = z.object({
	addon: DomainAddonSubscriptionDto.nullable(),
	entitlement: CustomDomainEntitlementDto,
});

export type TDomainAddonResponseDto = z.infer<typeof DomainAddonResponseDto>;

export const DomainAddonCheckoutResponseDto = z.object({
	url: z.string(),
});

export type TDomainAddonCheckoutResponseDto = z.infer<typeof DomainAddonCheckoutResponseDto>;

/**
 * Result of a slot change. `willDisable` names the domains that lose their slot when the change
 * takes effect — it comes from the same code that later performs the change, so the warning in
 * the UI and the domain that actually goes dark can never diverge.
 *
 * After a reduction `quantity` still reports the slots in force; the requested number lands in
 * `scheduledQuantity` and only applies from `effectiveAt`.
 */
export const DomainAddonQuantityResponseDto = z.object({
	quantity: z.number().int(),
	scheduledQuantity: z.number().int().nullable(),
	effectiveAt: z.iso.datetime().nullable(),
	willDisable: z.array(z.string()),
});

export type TDomainAddonQuantityResponseDto = z.infer<typeof DomainAddonQuantityResponseDto>;

/**
 * A quote for a quantity change, taken before anything is applied.
 *
 * `amountDueNow` is in minor units (cents) — formatting is the client's job, and integers avoid
 * the rounding drift a decimal string would introduce.
 */
export const DomainAddonQuantityPreviewDto = z.object({
	quantity: z.number().int(),
	currentQuantity: z.number().int(),
	scheduledQuantity: z.number().int().nullable(),
	/** `immediate` is billed on confirmation; `scheduled` costs nothing until `effectiveAt`. */
	mode: z.enum(['immediate', 'scheduled']),
	/** Always 0 in `scheduled` mode — a reduction is never credited back. */
	amountDueNow: z.number().int(),
	currency: z.string(),
	prorationDate: z.number().int().nullable(),
	periodEnd: z.iso.datetime(),
	effectiveAt: z.iso.datetime().nullable(),
	willDisable: z.array(z.string()),
	paymentMethod: z.object({ brand: z.string(), last4: z.string() }).nullable(),
});

export type TDomainAddonQuantityPreviewDto = z.infer<typeof DomainAddonQuantityPreviewDto>;

export const DomainAddonCancelResponseDto = z.object({
	cancelAtPeriodEnd: z.boolean(),
	effectiveAt: z.iso.datetime().nullable(),
	willDisable: z.array(z.string()),
});

export type TDomainAddonCancelResponseDto = z.infer<typeof DomainAddonCancelResponseDto>;
