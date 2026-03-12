import { SetQrCodeTagsPolicy } from '../set-qr-code-tags.policy';
import { MaxTagsExceededError } from '@/core/error/http/max-tags-exceeded.error';
import { UnauthorizedError } from '@/core/error/http';
import type { TUser } from '@/core/domain/schema/UserSchema';

describe('SetQrCodeTagsPolicy', () => {
	const freeUser: TUser = {
		id: 'user_123',
		plan: 'free' as any,
	} as TUser;

	const proUser: TUser = {
		id: 'user_456',
		plan: 'pro' as any,
	} as TUser;

	describe('checkAccess', () => {
		it('should throw UnauthorizedError when user is undefined', () => {
			const policy = new SetQrCodeTagsPolicy(undefined, 1);
			expect(() => policy.checkAccess()).toThrow(UnauthorizedError);
		});

		it('should allow any user to set up to 3 tags', () => {
			const policy = new SetQrCodeTagsPolicy(freeUser, 3);
			expect(policy.checkAccess()).toBe(true);
		});

		it('should throw MaxTagsExceededError when any user tries to set > 3 tags', () => {
			const policy = new SetQrCodeTagsPolicy(freeUser, 4);
			expect(() => policy.checkAccess()).toThrow(MaxTagsExceededError);
		});

		it('should apply the same limit regardless of plan', () => {
			const freePolicy = new SetQrCodeTagsPolicy(freeUser, 3);
			const proPolicy = new SetQrCodeTagsPolicy(proUser, 3);
			expect(freePolicy.checkAccess()).toBe(true);
			expect(proPolicy.checkAccess()).toBe(true);

			const freePolicyOver = new SetQrCodeTagsPolicy(freeUser, 4);
			const proPolicyOver = new SetQrCodeTagsPolicy(proUser, 4);
			expect(() => freePolicyOver.checkAccess()).toThrow(MaxTagsExceededError);
			expect(() => proPolicyOver.checkAccess()).toThrow(MaxTagsExceededError);
		});

		it('should allow setting 0 tags (clearing all tags)', () => {
			const policy = new SetQrCodeTagsPolicy(freeUser, 0);
			expect(policy.checkAccess()).toBe(true);
		});

		it('should include a descriptive error message', () => {
			const policy = new SetQrCodeTagsPolicy(freeUser, 4);
			expect(() => policy.checkAccess()).toThrow('You can add a maximum of 3 tags.');
		});
	});
});
