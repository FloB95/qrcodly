import { z } from 'zod';
import { NewsletterContentLocale } from './NewsletterContentLocale';

export const UpdateNewsletterSubscriptionDto = z
	.object({
		/** Only sent by the toggle; a language change leaves the membership alone */
		subscribed: z.boolean().optional(),
		/** Only sent when the user picks a language; stored as their choice and never overwritten */
		locale: NewsletterContentLocale.optional(),
	})
	.refine((value) => value.subscribed !== undefined || value.locale !== undefined, {
		message: 'Either subscribed or locale must be provided',
	});

export type TUpdateNewsletterSubscriptionDto = z.infer<typeof UpdateNewsletterSubscriptionDto>;
