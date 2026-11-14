import { type IListmonkSubscriber } from '@/libs/listmonk';
import {
	CLERK_USER_ID_ATTRIBUTE,
	clerkUserIdOf,
	isBlocked,
	isLinkedToOtherAccount,
	isOnList,
	leftOnOldAddress,
	matchSubscribers,
} from '../subscriber-match';

const LIST_ID = 7;

const subscriber = (overrides: Partial<IListmonkSubscriber> = {}): IListmonkSubscriber => ({
	id: 1,
	email: 'jane@example.com',
	name: 'Jane',
	status: 'enabled',
	attribs: {},
	lists: [],
	...overrides,
});

const linked = (overrides: Partial<IListmonkSubscriber> = {}) =>
	subscriber({
		email: 'old@example.com',
		attribs: { clerk_user_id: 'user_1' },
		lists: [{ id: LIST_ID, subscription_status: 'confirmed' }],
		...overrides,
	});

const holder = (overrides: Partial<IListmonkSubscriber> = {}) =>
	subscriber({ id: 2, ...overrides });

describe('subscriber matching', () => {
	it('links subscribers through the clerk_user_id attribute', () => {
		expect(CLERK_USER_ID_ATTRIBUTE).toBe('clerk_user_id');
		expect(clerkUserIdOf(linked())).toBe('user_1');
		expect(clerkUserIdOf(subscriber())).toBeNull();
		expect(clerkUserIdOf(subscriber({ attribs: { clerk_user_id: '' } }))).toBeNull();
		expect(clerkUserIdOf(subscriber({ attribs: { clerk_user_id: 42 } }))).toBeNull();
	});

	it('matches subscribers by Clerk id and by email', () => {
		const byClerkId = linked();
		const byEmail = holder({ email: 'Jane@Example.com' });

		expect(matchSubscribers([byEmail, byClerkId], 'user_1', 'jane@example.com')).toEqual({
			byClerkId,
			byEmail,
		});
		expect(matchSubscribers([byEmail], 'user_1')).toEqual({ byClerkId: null, byEmail: null });
	});

	it('finds the same record both ways while the email is unchanged', () => {
		const record = linked({ email: 'jane@example.com' });

		expect(matchSubscribers([record], 'user_1', 'jane@example.com')).toEqual({
			byClerkId: record,
			byEmail: record,
		});
	});

	it('counts every membership that is not unsubscribed as on the list', () => {
		const withStatus = (
			subscription_status: IListmonkSubscriber['lists'][number]['subscription_status'],
		) => subscriber({ lists: [{ id: LIST_ID, subscription_status }] });

		expect(isOnList(withStatus('confirmed'), LIST_ID)).toBe(true);
		expect(isOnList(withStatus('unconfirmed'), LIST_ID)).toBe(true);
		expect(isOnList(withStatus('unsubscribed'), LIST_ID)).toBe(false);
		expect(isOnList(withStatus('confirmed'), 3)).toBe(false);
	});

	describe('isBlocked', () => {
		it.each([
			['nobody is found', { byClerkId: null, byEmail: null }, false],
			['the linked record is enabled', { byClerkId: linked(), byEmail: null }, false],
			[
				'another enabled record holds the address',
				{ byClerkId: linked(), byEmail: holder() },
				false,
			],
			[
				'the linked record is blocklisted, also at an old address',
				{ byClerkId: linked({ status: 'blocklisted' }), byEmail: null },
				true,
			],
			[
				'only the current address is blocklisted',
				{ byClerkId: null, byEmail: holder({ status: 'blocklisted' }) },
				true,
			],
			[
				'the account moved onto a blocklisted address',
				{ byClerkId: linked(), byEmail: holder({ status: 'blocklisted' }) },
				true,
			],
		])('when %s', (_, match, blocked) => {
			expect(isBlocked(match)).toBe(blocked);
		});
	});

	describe('isLinkedToOtherAccount', () => {
		const foreign = holder({ attribs: { clerk_user_id: 'user_other' } });

		it('is true when only a subscriber of another account holds the address', () => {
			expect(isLinkedToOtherAccount({ byClerkId: null, byEmail: foreign })).toBe(true);
		});

		it.each([
			['nobody is found', { byClerkId: null, byEmail: null }],
			['the address holder is not linked to any account', { byClerkId: null, byEmail: holder() }],
			['the account has its own subscriber', { byClerkId: linked(), byEmail: foreign }],
		])('is false when %s', (_, match) => {
			expect(isLinkedToOtherAccount(match)).toBe(false);
		});
	});

	describe('leftOnOldAddress', () => {
		const blockedHolder = holder({ status: 'blocklisted' });

		it('is the linked subscriber once the account moved onto a blocklisted address', () => {
			const byClerkId = linked();

			expect(leftOnOldAddress({ byClerkId, byEmail: blockedHolder }, LIST_ID)).toBe(byClerkId);
		});

		it.each([
			[
				'it is already off the list',
				linked({ lists: [{ id: LIST_ID, subscription_status: 'unsubscribed' }] }),
				blockedHolder,
			],
			['it has no membership', linked({ lists: [] }), blockedHolder],
			['it is blocklisted itself', linked({ status: 'blocklisted' }), blockedHolder],
			['the address holder is not blocklisted', linked(), holder()],
			['nobody else holds the address', linked(), null],
		])('is null when %s', (_, byClerkId, byEmail) => {
			expect(leftOnOldAddress({ byClerkId, byEmail }, LIST_ID)).toBeNull();
		});

		it('is null when the blocklisted record is the linked one', () => {
			const record = linked({ email: 'jane@example.com', status: 'blocklisted' });

			expect(leftOnOldAddress({ byClerkId: record, byEmail: record }, LIST_ID)).toBeNull();
		});

		it('is null without a linked subscriber', () => {
			expect(leftOnOldAddress({ byClerkId: null, byEmail: blockedHolder }, LIST_ID)).toBeNull();
		});
	});
});
