import { z } from 'zod';

export const NewsletterSubscriptionStatus = z.enum([
	'subscribed',
	'unsubscribed',
	'blocked',
	'unavailable',
	/** listmonk is not configured on this deployment; the UI hides the setting */
	'disabled',
]);

export type TNewsletterSubscriptionStatus = z.infer<typeof NewsletterSubscriptionStatus>;
