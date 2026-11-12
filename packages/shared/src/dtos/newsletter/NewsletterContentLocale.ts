import { z } from 'zod';

/** The languages a newsletter is written in; every other UI language gets English */
export const NewsletterContentLocale = z.enum(['en', 'de']);

export type TNewsletterContentLocale = z.infer<typeof NewsletterContentLocale>;
