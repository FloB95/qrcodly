import { type TNewsletterContentLocale } from '@shared/schemas';

/** The parts of a Clerk user the newsletter needs, from the SDK or from a webhook payload */
export interface INewsletterUser {
	id: string;
	/** Verified primary address in lower case, null when there is none */
	email: string | null;
	firstName: string | null;
	/** Only written when a subscriber is created: the sign-up page's language */
	locale: TNewsletterContentLocale;
	banned: boolean;
}

/**
 * Only these accounts get a subscriber or have its email followed: a verified primary address and
 * not banned. A banned account is taken off the list.
 */
export type TEligibleNewsletterUser = INewsletterUser & { email: string };
