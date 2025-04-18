/* eslint-disable @typescript-eslint/unbound-method */
import { container } from 'tsyringe';
import { CronJobWorker } from '@/core/jobs/CronJobWorker';
import { AbstractCronJob } from '@/core/jobs/AbstractCronJob';
import { CronJob } from '../CronJob';

class TestCronJob extends AbstractCronJob {
	static readonly jobName = 'TestCronJob';
	schedule = '* * * * *'; // Every minute for testing

	constructor() {
		super();
	}

	getJobName(): string {
		return TestCronJob.jobName;
	}

	async execute(): Promise<void> {
		// Test implementation
	}
}

describe('CronJob', () => {
	let cronJobWorker: CronJobWorker;

	beforeEach(() => {
		cronJobWorker = container.resolve(CronJobWorker);
		jest.spyOn(cronJobWorker, 'registerJob');
		jest.clearAllMocks();
	});

	it('should register a class as a cron job', () => {
		@CronJob()
		class TestCronJobHandler extends TestCronJob {}

		container.resolve(TestCronJobHandler);
		expect(cronJobWorker.registerJob).toHaveBeenCalledTimes(1);
		expect(cronJobWorker.registerJob).toHaveBeenCalledWith(expect.any(TestCronJobHandler));
	});

	it('should throw an error if the class does not extend AbstractCronJob', () => {
		expect(() => {
			@CronJob()
			class InvalidCronJob {
				execute() {}
			}

			container.resolve(InvalidCronJob);
		}).toThrow('Class InvalidCronJob must extend AbstractCronJob to use "CronJob"');
	});

	it('should register a class as a cron job and execute it', async () => {
		const executeMock = jest.fn();

		@CronJob()
		class TestCronJobHandler extends TestCronJob {
			async execute(): Promise<void> {
				await executeMock();
			}
		}

		const jobInstance = container.resolve(TestCronJobHandler);
		expect(cronJobWorker.registerJob).toHaveBeenCalledTimes(1);
		expect(cronJobWorker.registerJob).toHaveBeenCalledWith(expect.any(TestCronJobHandler));

		await jobInstance.execute();
		expect(executeMock).toHaveBeenCalledTimes(1);
	});
});
