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
	quantity: z.number().int(),
	/** Slot count that takes effect at `pendingQuantityEffectiveAt`, if a reduction is scheduled. */
	pendingQuantity: z.number().int().nullable(),
	pendingQuantityEffectiveAt: z.iso.datetime().nullable(),
	currentPeriodEnd: z.iso.datetime(),
	cancelAtPeriodEnd: z.boolean(),
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
 */
export const DomainAddonQuantityResponseDto = z.object({
	quantity: z.number().int(),
	pendingQuantity: z.number().int().nullable(),
	effectiveAt: z.iso.datetime().nullable(),
	willDisable: z.array(z.string()),
});

export type TDomainAddonQuantityResponseDto = z.infer<typeof DomainAddonQuantityResponseDto>;

export const DomainAddonCancelResponseDto = z.object({
	cancelAtPeriodEnd: z.boolean(),
	effectiveAt: z.iso.datetime().nullable(),
	willDisable: z.array(z.string()),
});

export type TDomainAddonCancelResponseDto = z.infer<typeof DomainAddonCancelResponseDto>;
