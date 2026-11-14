import type { User, UserJSON } from '@clerk/fastify';
import { type TNewsletterContentLocale } from '@shared/schemas';
import { type IListmonkCreateSubscriberInput } from '@/libs/listmonk';
import { localeAttribs, signUpLocale } from './newsletter-locale';
import { type TNewsletterSource } from './newsletter-sync.interface';
import { type INewsletterUser, type TEligibleNewsletterUser } from './newsletter-user.interface';
import { CLERK_USER_ID_ATTRIBUTE } from './subscriber-match';

export const isEligible = (user: INewsletterUser): user is TEligibleNewsletterUser =>
	!!user.email && !user.banned;

export const subscriberName = (user: INewsletterUser): string | null =>
	user.firstName ?? user.email?.split('@')[0] ?? null;

/** The listmonk subscriber a new account gets; it joins `listIds` as confirmed */
export const newSubscriberInput = (
	user: TEligibleNewsletterUser,
	source: TNewsletterSource,
	listIds: number[],
	chosenLocale?: TNewsletterContentLocale,
): IListmonkCreateSubscriberInput => ({
	email: user.email,
	name: subscriberName(user) ?? user.email,
	attribs: {
		[CLERK_USER_ID_ATTRIBUTE]: user.id,
		...(chosenLocale ? localeAttribs(chosenLocale, 'user') : localeAttribs(user.locale, 'auto')),
		source,
	},
	listIds,
});

export const fromClerkUser = (user: User): INewsletterUser => {
	const primary = user.primaryEmailAddress;
	const email =
		primary?.verification?.status === 'verified' ? primary.emailAddress.toLowerCase() : null;
	return {
		id: user.id,
		email,
		firstName: user.firstName?.trim() || null,
		locale: signUpLocale(user.unsafeMetadata?.locale),
		banned: user.banned || user.privateMetadata?.banned === true,
	};
};

export const fromUserJSON = (user: UserJSON): INewsletterUser => {
	const primary = user.email_addresses?.find(
		(address) => address.id === user.primary_email_address_id,
	);
	const email =
		primary?.verification?.status === 'verified' ? primary.email_address.toLowerCase() : null;
	return {
		id: user.id,
		email,
		firstName: user.first_name?.trim() || null,
		locale: signUpLocale(user.unsafe_metadata?.locale),
		banned: user.banned === true || user.private_metadata?.banned === true,
	};
};
