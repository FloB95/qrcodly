import 'reflect-metadata';
import { mock, type MockProxy } from 'jest-mock-extended';
import { container } from 'tsyringe';
import { type TTrackScanDto } from '@shared/schemas';
import { type Logger } from '@/core/logging';
import { ShortUrlScannedEvent } from '@/modules/url-shortener/event/short-url-scanned.event';
import { type ForwardScanUseCase } from '../../../useCase/forward-scan.use-case';
import { ForwardScanOnShortUrlScannedEventHandler } from '../short-url-scanned.event-handler';

jest.mock('tsyringe', () => {
	const actual = jest.requireActual('tsyringe');
	return { ...actual, container: { ...actual.container, resolve: jest.fn() } };
});

describe('ForwardScanOnShortUrlScannedEventHandler', () => {
	let logger: MockProxy<Logger>;
	let forwardScan: MockProxy<ForwardScanUseCase>;
	let handler: ForwardScanOnShortUrlScannedEventHandler;

	const scan = { url: 'https://example.com/u/abc12', ip: '203.0.113.42' } as TTrackScanDto;
	const event = new ShortUrlScannedEvent('abc12', 'user-1', scan);

	beforeEach(() => {
		logger = mock<Logger>();
		forwardScan = mock<ForwardScanUseCase>();
		(container.resolve as jest.Mock).mockImplementation((token: unknown) => {
			const name = typeof token === 'function' ? token.name : String(token);
			if (name === 'Logger') return logger;
			if (name === 'ForwardScanUseCase') return forwardScan;
			return {};
		});
		handler = new ForwardScanOnShortUrlScannedEventHandler();
	});

	it('forwards the scan', async () => {
		await handler.handle(event);

		expect(forwardScan.execute).toHaveBeenCalledWith('abc12', 'user-1', scan);
	});

	it('waits for the forwarding', async () => {
		let finished = false;
		forwardScan.execute.mockImplementation(async () => {
			await new Promise((resolve) => setImmediate(resolve));
			finished = true;
		});

		await handler.handle(event);

		expect(finished).toBe(true);
	});

	it('logs a failure instead of letting it escape', async () => {
		forwardScan.execute.mockRejectedValue(new Error('boom'));

		await expect(handler.handle(event)).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			'analytics.scan.forward.failed',
			expect.objectContaining({ shortCode: 'abc12' }),
		);
	});
});
