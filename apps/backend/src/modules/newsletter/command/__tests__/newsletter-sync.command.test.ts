import 'reflect-metadata';
import { Command } from 'commander';
import { mock, type MockProxy } from 'jest-mock-extended';
import { type TNewsletterReconciliationSummary } from '../../domain/newsletter-sync.interface';
import { NewsletterSyncAbortedError } from '../../error/newsletter-sync-aborted.error';
import { type NewsletterReconciliationService } from '../../service/newsletter-reconciliation.service';
import NewsletterSyncCommand from '../newsletter-sync.command';

describe('NewsletterSyncCommand', () => {
	let reconciliation: MockProxy<NewsletterReconciliationService>;
	let exit: jest.SpyInstance;

	const runCli = async (...args: string[]) => {
		const cli = new Command();
		new NewsletterSyncCommand(reconciliation).register(cli);
		await cli.parseAsync(['newsletter-sync', ...args], { from: 'user' });
	};

	beforeEach(() => {
		reconciliation = mock<NewsletterReconciliationService>();
		exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
		jest.spyOn(console, 'log').mockImplementation(() => undefined);
		jest.spyOn(console, 'table').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('exits with 1 and prints the reason when the sync aborts', async () => {
		const aborted = new NewsletterSyncAbortedError('too_many_deletions');
		reconciliation.run.mockRejectedValue(aborted);

		await runCli('--dry-run');

		expect(reconciliation.run).toHaveBeenCalledWith({ dryRun: true, allowMassDelete: false });
		expect(aborted.message).toContain('too_many_deletions');
		expect(console.error).toHaveBeenCalledWith('Command execution failed:', aborted);
		expect(exit).toHaveBeenCalledWith(1);
		expect(exit).not.toHaveBeenCalledWith(0);
	});

	it('exits with 1 when listmonk is not configured', async () => {
		reconciliation.run.mockResolvedValue(null);

		await runCli();

		expect(console.error).toHaveBeenCalledWith(
			'Command execution failed:',
			expect.objectContaining({ message: expect.stringContaining('not configured') }),
		);
		expect(exit).toHaveBeenCalledWith(1);
	});

	it('exits with 0 after a completed run and passes --allow-mass-delete on', async () => {
		const summary = { created: 1 } as TNewsletterReconciliationSummary;
		reconciliation.run.mockResolvedValue(summary);

		await runCli('--allow-mass-delete');

		expect(reconciliation.run).toHaveBeenCalledWith({ dryRun: false, allowMassDelete: true });
		expect(console.table).toHaveBeenCalledWith(summary);
		expect(exit).toHaveBeenCalledWith(0);
	});
});
