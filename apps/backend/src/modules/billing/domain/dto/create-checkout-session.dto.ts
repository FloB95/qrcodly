import { z } from 'zod';

export const CreateCheckoutSessionDto = z.object({
	priceId: z.string(),
	locale: z.string().optional(),
	successUrl: z.url().optional(),
	cancelUrl: z.url().optional(),
});

export type TCreateCheckoutSessionDto = z.infer<typeof CreateCheckoutSessionDto>;
