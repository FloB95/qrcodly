import type { User, UserJSON } from '@clerk/fastify';
import {
	fromClerkUser,
	fromUserJSON,
	isEligible,
	newSubscriberInput,
	subscriberName,
} from '../newsletter-user';
import { type INewsletterUser, type TEligibleNewsletterUser } from '../newsletter-user.interface';

const userJSON = (overrides: Partial<UserJSON> = {}): UserJSON =>
	({
		id: 'user_1',
		first_name: ' Jane ',
		locale: 'de-DE',
		banned: false,
		private_metadata: {},
		primary_email_address_id: 'idn_2',
		email_addresses: [
			{ id: 'idn_1', email_address: 'old@example.com', verification: { status: 'verified' } },
			{ id: 'idn_2', email_address: 'Jane@Example.com', verification: { status: 'verified' } },
		],
		...overrides,
	}) as unknown as UserJSON;

const newsletterUser = (overrides: Partial<INewsletterUser> = {}): INewsletterUser => ({
	id: 'user_1',
	email: 'jane@example.com',
	firstName: 'Jane',
	locale: 'de',
	banned: false,
	...overrides,
});

describe('newsletter user', () => {
	it('uses the verified primary address from a webhook payload', () => {
		expect(fromUserJSON(userJSON())).toEqual({
			id: 'user_1',
			email: 'jane@example.com',
			firstName: 'Jane',
			// Clerk's own locale is ignored
			locale: 'en',
			banned: false,
		});
	});

	it('has no email when the primary address is not verified', () => {
		const payload = userJSON({
			email_addresses: [
				{ id: 'idn_2', email_address: 'jane@example.com', verification: { status: 'unverified' } },
			],
		} as unknown as Partial<UserJSON>);

		expect(fromUserJSON(payload).email).toBeNull();
	});

	it('marks users banned by Clerk or by private metadata', () => {
		expect(fromUserJSON(userJSON({ banned: true })).banned).toBe(true);
		expect(fromUserJSON(userJSON({ private_metadata: { banned: true } })).banned).toBe(true);
	});

	it('takes the language of the sign-up page from a webhook payload', () => {
		expect(fromUserJSON(userJSON({ unsafe_metadata: { locale: 'de' } })).locale).toBe('de');
		expect(fromUserJSON(userJSON({ unsafe_metadata: { locale: 'fr' } })).locale).toBe('en');
	});

	it('maps an SDK user', () => {
		const user = {
			id: 'user_1',
			firstName: null,
			locale: null,
			banned: false,
			privateMetadata: { banned: true },
			unsafeMetadata: { locale: 'de' },
			primaryEmailAddress: {
				emailAddress: 'Jane@Example.com',
				verification: { status: 'verified' },
			},
		} as unknown as User;

		expect(fromClerkUser(user)).toEqual({
			id: 'user_1',
			email: 'jane@example.com',
			firstName: null,
			locale: 'de',
			banned: true,
		});
	});

	it('gives an SDK user without a sign-up language English, also with a .de address', () => {
		const user = {
			id: 'user_1',
			firstName: null,
			locale: 'de-DE',
			banned: false,
			privateMetadata: {},
			primaryEmailAddress: {
				emailAddress: 'jane@example.de',
				verification: { status: 'verified' },
			},
		} as unknown as User;

		expect(fromClerkUser(user).locale).toBe('en');
	});

	it('has no email for an SDK user whose primary address is not verified', () => {
		const user = {
			id: 'user_1',
			firstName: 'Jane',
			locale: 'en-US',
			banned: false,
			privateMetadata: {},
			primaryEmailAddress: {
				emailAddress: 'jane@example.com',
				verification: { status: 'unverified' },
			},
		} as unknown as User;

		expect(fromClerkUser(user)).toMatchObject({ email: null, locale: 'en' });
	});

	it.each([
		['with a verified email', newsletterUser(), true],
		['without a verified email', newsletterUser({ email: null }), false],
		['who is banned', newsletterUser({ banned: true }), false],
	])('decides whether a user %s gets the newsletter', (_, user, eligible) => {
		expect(isEligible(user)).toBe(eligible);
	});

	it('names a subscriber by first name, else by the part before the @', () => {
		expect(subscriberName(newsletterUser())).toBe('Jane');
		expect(subscriberName(newsletterUser({ firstName: null }))).toBe('jane');
		expect(subscriberName(newsletterUser({ firstName: null, email: null }))).toBeNull();
	});

	describe('newSubscriberInput', () => {
		const eligible = (overrides: Partial<INewsletterUser> = {}) =>
			newsletterUser(overrides) as TEligibleNewsletterUser;

		it('links the subscriber to the account and records the sign-up locale and source', () => {
			expect(newSubscriberInput(eligible(), 'signup', [7])).toEqual({
				email: 'jane@example.com',
				name: 'Jane',
				attribs: { clerk_user_id: 'user_1', locale: 'de', locale_source: 'auto', source: 'signup' },
				listIds: [7],
			});
		});

		it('records a language the user picked and falls back to the part before the @', () => {
			expect(newSubscriberInput(eligible({ firstName: null }), 'settings', [], 'en')).toEqual({
				email: 'jane@example.com',
				name: 'jane',
				attribs: {
					clerk_user_id: 'user_1',
					locale: 'en',
					locale_source: 'user',
					source: 'settings',
				},
				listIds: [],
			});
		});
	});
});
