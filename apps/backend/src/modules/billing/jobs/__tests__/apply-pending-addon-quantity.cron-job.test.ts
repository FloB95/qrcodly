import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type Logger } from '@/core/logging';
import { type Mailer } from '@/core/mailer/mailer';
import { type TUserAddonSubscription } from '../../domain/entities/user-addon-subscription.entity';
import { container } from 'tsyringe';

jest.mock('@/core/decorators/cron-job.decorator', () => ({
	CronJob: () => () => {},
}));

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

// Import after mocks are set up
import { ApplyPendingAddonQuantityCronJob } from '../apply-pending-addon-quantity.cron-job';

const dueAddon = {
	id: 'row-1',
	userId: 'user-123',
	quantity: 5,
	pendingQuantity: 2,
} as TUserAddonSubscription;

describe('ApplyPendingAddonQuantityCronJob', () => {
	let job: ApplyPendingAddonQuantityCronJob;
	let mockLogger: MockProxy<Logger>;
	let mockMailer: MockProxy<Mailer>;
	let mockRepository: Record<string, jest.Mock>;
	let mockApplyPending: Record<string, jest.Mock>;
	let mockClerkUserInfoService: Record<string, jest.Mock>;

	const run = () => (job as unknown as { execute: () => Promise<void> }).execute();

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockMailer = mock<Mailer>();
		mockRepository = { findDuePendingQuantities: jest.fn().mockResolvedValue([]) };
		mockApplyPending = {
			execute: jest.fn().mockResolvedValue({ quantity: 2, disabled: ['b.example.com'] }),
		};
		mockClerkUserInfoService = {
			getUserInfo: jest.fn().mockResolvedValue({ email: 'user@example.com', firstName: 'Jane' }),
		};
		mockMailer.getTemplate.mockResolvedValue(() => '<html></html>');

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'Logger':
					return mockLogger;
				case 'Mailer':
					return mockMailer;
				case 'UserAddonSubscriptionRepository':
					return mockRepository;
				case 'ApplyPendingAddonQuantityUseCase':
					return mockApplyPending;
				case 'ClerkUserInfoService':
					return mockClerkUserInfoService;
				default:
					return {};
			}
		});

		job = new ApplyPendingAddonQuantityCronJob();
		(job as unknown as { logger: Logger }).logger = mockLogger;
	});

	afterEach(() => jest.clearAllMocks());

	it('should do nothing when no reduction is due', async () => {
		await run();

		expect(mockApplyPending.execute).not.toHaveBeenCalled();
		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should apply a due reduction and notify the user', async () => {
		mockRepository.findDuePendingQuantities.mockResolvedValue([dueAddon]);

		await run();

		expect(mockApplyPending.execute).toHaveBeenCalledWith(dueAddon);
		expect(mockMailer.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@example.com',
				template: 'domain-addon-quantity-reduced',
			}),
		);
	});

	it('should still apply the reduction when the user has no email', async () => {
		mockRepository.findDuePendingQuantities.mockResolvedValue([dueAddon]);
		mockClerkUserInfoService.getUserInfo.mockResolvedValue({ email: '' });

		await run();

		expect(mockApplyPending.execute).toHaveBeenCalled();
		expect(mockMailer.sendMail).not.toHaveBeenCalled();
	});

	it('should keep going when one subscription fails', async () => {
		mockRepository.findDuePendingQuantities.mockResolvedValue([dueAddon, dueAddon]);
		mockApplyPending.execute.mockRejectedValueOnce(new Error('boom'));

		await run();

		expect(mockLogger.error).toHaveBeenCalledWith(
			'domainAddon.applyPendingQuantityFailed',
			expect.anything(),
		);
		expect(mockApplyPending.execute).toHaveBeenCalledTimes(2);
	});
});
