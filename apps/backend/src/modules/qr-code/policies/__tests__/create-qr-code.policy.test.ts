import { CreateQrCodePolicy } from '../create-qr-code.policy';
import { PlanLimitExceededError } from '@/core/error/http/plan-limit-exceeded.error';
import { UnauthorizedError } from '@/core/error/http';
import type { TUser } from '@/core/domain/schema/UserSchema';
import type { TCreateQrCodeDto } from '@shared/schemas';
import { QrCodeDefaults } from '@shared/schemas';

// Mock the plan config
jest.mock('@/core/config/plan.config', () => ({
	QR_CODE_PLAN_LIMITS: {
		free: {
			url: 10,
			text: 5,
			event: 0, // Disabled for free plan
		},
		pro: {
			url: null, // Unlimited
			text: null,
			event: 100,
		},
	},
}));

interface MockUsageService {
	count: jest.Mock;
	increment: jest.Mock;
}

describe('CreateQrCodePolicy', () => {
	let mockUsageService: MockUsageService;

	beforeEach(() => {
		mockUsageService = {
			count: jest.fn(),
			increment: jest.fn(),
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	const createPolicy = (user: TUser | undefined, dto: TCreateQrCodeDto) => {
		const policy = new CreateQrCodePolicy(user, dto);
		(policy as any).usageService = mockUsageService;
		return policy;
	};

	describe('checkAccess', () => {
		const mockUser: TUser = {
			id: 'user_123',
			plan: 'free' as any,
		} as TUser;

		const mockDto: TCreateQrCodeDto = {
			name: 'Test QR',
			content: {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: false,
				},
			},
			config: QrCodeDefaults,
		};

		it('should allow access when limit is undefined for content type', async () => {
			const dto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'wifi',
					data: {
						ssid: 'test',
						password: 'pass',
						encryption: 'WPA',
					},
				},
			};
			const policy = createPolicy(mockUser, dto);

			const result = await policy.checkAccess();

			expect(result).toBe(true);
		});

		it('should allow access when limit is null for content type', async () => {
			const proUser: TUser = { ...mockUser, plan: 'pro' as any };
			const policy = createPolicy(proUser, mockDto);

			const result = await policy.checkAccess();

			expect(result).toBe(true);
		});

		it('should throw PlanLimitExceededError when limit is 0 for content type', async () => {
			const dto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'event',
					data: {
						title: 'Event',
						startDate: new Date().toISOString(),
						endDate: new Date().toISOString(),
					},
				},
			};
			const policy = createPolicy(mockUser, dto);

			await expect(policy.checkAccess()).rejects.toThrow(PlanLimitExceededError);
		});

		it('should allow access when usage < limit', async () => {
			mockUsageService.count.mockResolvedValue(5);
			const policy = createPolicy(mockUser, mockDto);

			const result = await policy.checkAccess();

			expect(result).toBe(true);
		});

		it('should throw PlanLimitExceededError when usage >= limit', async () => {
			mockUsageService.count.mockResolvedValue(10);
			const policy = createPolicy(mockUser, mockDto);

			await expect(policy.checkAccess()).rejects.toThrow(PlanLimitExceededError);
		});

		it('should check correct limit based on user plan (free, pro, etc.)', async () => {
			const freeUserDto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'url',
					data: { url: 'https://example.com', isEditable: false },
				},
			};

			mockUsageService.count.mockResolvedValue(5);
			const freePolicy = createPolicy(mockUser, freeUserDto);
			await freePolicy.checkAccess();

			// Free plan has limit of 10 for URL
			expect(mockUsageService.count).toHaveBeenCalled();

			mockUsageService.count.mockClear();

			const proUser: TUser = { ...mockUser, plan: 'pro' as any };
			const proPolicy = createPolicy(proUser, freeUserDto);
			const result = await proPolicy.checkAccess();

			// Pro plan has no limit (null)
			expect(mockUsageService.count).not.toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it('should check correct limit based on content type', async () => {
			const urlDto: TCreateQrCodeDto = {
				...mockDto,
				content: { type: 'url', data: { url: 'https://example.com', isEditable: false } },
			};

			mockUsageService.count.mockResolvedValue(5);
			const urlPolicy = createPolicy(mockUser, urlDto);
			await urlPolicy.checkAccess();

			expect(mockUsageService.count).toHaveBeenCalledWith(
				'user_123',
				'CreateQrCodePolicy:user_123:url',
			);

			mockUsageService.count.mockClear();

			const textDto: TCreateQrCodeDto = {
				...mockDto,
				content: { type: 'text', data: 'Some text' },
			};

			mockUsageService.count.mockResolvedValue(2);
			const textPolicy = createPolicy(mockUser, textDto);
			await textPolicy.checkAccess();

			expect(mockUsageService.count).toHaveBeenCalledWith(
				'user_123',
				'CreateQrCodePolicy:user_123:text',
			);
		});

		it('should throw UnauthorizedError when user is undefined and limit exists', async () => {
			const policy = createPolicy(undefined, mockDto);

			await expect(policy.checkAccess()).rejects.toThrow(UnauthorizedError);
		});

		it('should allow access when user is undefined and no limit set', async () => {
			const dto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'wifi',
					data: {
						ssid: 'test',
						password: 'pass',
						encryption: 'WPA',
					},
				},
			};
			const policy = createPolicy(undefined, dto);

			const result = await policy.checkAccess();

			expect(result).toBe(true);
		});

		it('should throw UnauthorizedError for editable URL without user', async () => {
			const dto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'url',
					data: {
						url: 'https://example.com',
						isEditable: true,
					},
				},
			};
			const policy = createPolicy(undefined, dto);

			await expect(policy.checkAccess()).rejects.toThrow(UnauthorizedError);
			await expect(policy.checkAccess()).rejects.toThrow('dynamic QR codes');
		});

		it('should throw UnauthorizedError for dynamic vCard without user', async () => {
			const dto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'vCard',
					data: {
						firstName: 'John',
						isDynamic: true,
					},
				},
			};
			const policy = createPolicy(undefined, dto);

			await expect(policy.checkAccess()).rejects.toThrow(UnauthorizedError);
			await expect(policy.checkAccess()).rejects.toThrow('dynamic QR codes');
		});

		it('should throw UnauthorizedError for event without user', async () => {
			const dto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'event',
					data: {
						title: 'Event',
						startDate: new Date('2026-01-01').toISOString(),
						endDate: new Date('2026-01-02').toISOString(),
					},
				},
			};
			const policy = createPolicy(undefined, dto);

			await expect(policy.checkAccess()).rejects.toThrow(UnauthorizedError);
			await expect(policy.checkAccess()).rejects.toThrow('dynamic QR codes');
		});

		it('should throw UnauthorizedError for static URL without user when limit exists', async () => {
			const dto: TCreateQrCodeDto = {
				...mockDto,
				content: {
					type: 'url',
					data: {
						url: 'https://example.com',
						isEditable: false,
					},
				},
			};
			const policy = createPolicy(undefined, dto);

			await expect(policy.checkAccess()).rejects.toThrow(UnauthorizedError);
		});

		it('should call usageService.count() with correct key', async () => {
			mockUsageService.count.mockResolvedValue(5);
			const policy = createPolicy(mockUser, mockDto);

			await policy.checkAccess();

			expect(mockUsageService.count).toHaveBeenCalledWith(
				'user_123',
				'CreateQrCodePolicy:user_123:url',
			);
		});

		it('should use key format: CreateQrCodePolicy:{userId}:{contentType}', async () => {
			mockUsageService.count.mockResolvedValue(5);
			const policy = createPolicy(mockUser, mockDto);

			await policy.checkAccess();

			expect(mockUsageService.count).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringMatching(/^CreateQrCodePolicy:user_123:url$/),
			);
		});
	});

	describe('incrementUsage', () => {
		const mockUser: TUser = {
			id: 'user_123',
			plan: 'free' as any,
		} as TUser;

		const mockDto: TCreateQrCodeDto = {
			name: 'Test QR',
			content: {
				type: 'url',
				data: {
					url: 'https://example.com',
					isEditable: false,
				},
			},
			config: QrCodeDefaults,
		};

		it('should call usageService.increment() after successful creation', async () => {
			const policy = createPolicy(mockUser, mockDto);

			await policy.incrementUsage();

			expect(mockUsageService.increment).toHaveBeenCalledWith(
				'user_123',
				'CreateQrCodePolicy:user_123:url',
			);
		});

		it('should not increment when user is undefined', async () => {
			const policy = createPolicy(undefined, mockDto);

			await policy.incrementUsage();

			expect(mockUsageService.increment).not.toHaveBeenCalled();
		});

		it('should increment with correct key', async () => {
			const policy = createPolicy(mockUser, mockDto);

			await policy.incrementUsage();

			expect(mockUsageService.increment).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringMatching(/^CreateQrCodePolicy:user_123:url$/),
			);
		});
	});
});
