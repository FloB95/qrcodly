import { z } from 'zod';

/**
 * Upper bound on purchasable extra domain slots. Shared so the stepper in the UI and the
 * server-side guard can never disagree.
 */
export const MAX_DOMAIN_ADDON_SLOTS = 20;

const slotQuantity = z
	.number()
	.int()
	.min(1, 'At least one extra domain is required')
	.max(MAX_DOMAIN_ADDON_SLOTS, `At most ${MAX_DOMAIN_ADDON_SLOTS} extra domains are supported`);

/**
 * Starts a Stripe Checkout session for extra custom domains.
 */
export const CreateDomainAddonCheckoutDto = z.object({
	priceId: z.string().min(1),
	quantity: slotQuantity,
	locale: z.string().optional(),
	successUrl: z.string().optional(),
	cancelUrl: z.string().optional(),
});

export type TCreateDomainAddonCheckoutDto = z.infer<typeof CreateDomainAddonCheckoutDto>;

/**
 * Changes how many extra domain slots the user holds.
 */
export const UpdateDomainAddonQuantityDto = z.object({
	quantity: slotQuantity,
});

export type TUpdateDomainAddonQuantityDto = z.infer<typeof UpdateDomainAddonQuantityDto>;
