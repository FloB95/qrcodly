import { z } from 'zod';
import { NewsletterContentLocale } from './NewsletterContentLocale';
import { NewsletterSubscriptionStatus } from './NewsletterSubscriptionStatus';

export const NewsletterSubscriptionResponseDto = z.object({
	status: NewsletterSubscriptionStatus,
	/** The stored language, English when none is stored; null when there is nothing to choose for */
	locale: NewsletterContentLocale.nullable(),
});

export type TNewsletterSubscriptionResponseDto = z.infer<typeof NewsletterSubscriptionResponseDto>;
