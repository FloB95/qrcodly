import { SetQrCodeTagsPolicy } from '../set-qr-code-tags.policy';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
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

		it('should allow free user to set exactly 1 tag', () => {
			const policy = new SetQrCodeTagsPolicy(freeUser, 1);
			expect(policy.checkAccess()).toBe(true);
		});

		it('should throw PlanLimitExceededError when free user tries to set > 1 tag', () => {
			const policy = new SetQrCodeTagsPolicy(freeUser, 2);
			expect(() => policy.checkAccess()).toThrow(PlanLimitExceededError);
		});

		it('should allow pro user to set up to 3 tags', () => {
			const policy = new SetQrCodeTagsPolicy(proUser, 3);
			expect(policy.checkAccess()).toBe(true);
		});

		it('should throw PlanLimitExceededError when pro user tries to set > 3 tags', () => {
			const policy = new SetQrCodeTagsPolicy(proUser, 4);
			expect(() => policy.checkAccess()).toThrow(PlanLimitExceededError);
		});

		it('should allow setting 0 tags (clearing all tags)', () => {
			const policy = new SetQrCodeTagsPolicy(freeUser, 0);
			expect(policy.checkAccess()).toBe(true);
		});

		it('should default to free plan limits when user.plan is undefined', () => {
			const userNoPlan: TUser = { id: 'user_789' } as TUser;
			const policy = new SetQrCodeTagsPolicy(userNoPlan, 2);
			expect(() => policy.checkAccess()).toThrow(PlanLimitExceededError);
		});
	});
});
