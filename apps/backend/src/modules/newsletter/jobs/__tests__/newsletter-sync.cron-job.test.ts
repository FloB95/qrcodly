import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { type Logger } from '@/core/logging';

jest.mock('@/core/decorators/cron-job.decorator', () => ({
	CronJob: () => () => {},
}));

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

// Import after mocks are set up
import { type NewsletterReconciliationService } from '../../service/newsletter-reconciliation.service';
import { NewsletterSyncAbortedError } from '../../error/newsletter-sync-aborted.error';
import { NewsletterSyncCronJob } from '../newsletter-sync.cron-job';

describe('NewsletterSyncCronJob', () => {
	let reconciliation: MockProxy<NewsletterReconciliationService>;
	let job: NewsletterSyncCronJob;

	beforeEach(() => {
		reconciliation = mock<NewsletterReconciliationService>();
		const logger = mock<Logger>();

		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			switch (name) {
				case 'NewsletterReconciliationService':
					return reconciliation;
				case 'Logger':
					return logger;
				default:
					return {};
			}
		});

		job = new NewsletterSyncCronJob();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('runs every night at 04:30', () => {
		expect(job.schedule).toBe('30 4 * * *');
	});

	it('runs the reconciliation for real, without lifting the deletion limit', async () => {
		reconciliation.run.mockResolvedValue(null);

		await (job as unknown as { execute(): Promise<void> }).execute();

		expect(reconciliation.run).toHaveBeenCalledTimes(1);
		expect(reconciliation.run).toHaveBeenCalledWith({ dryRun: false });
	});

	// AbstractCronJob records a run as failed only when execute() throws
	it('fails when the reconciliation aborts', async () => {
		const aborted = new NewsletterSyncAbortedError('too_many_deletions');
		reconciliation.run.mockRejectedValue(aborted);

		await expect((job as unknown as { execute(): Promise<void> }).execute()).rejects.toBe(aborted);
	});
});
