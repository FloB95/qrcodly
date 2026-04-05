import 'reflect-metadata';
import { DispatchTrackingEventUseCase } from '../dispatch-tracking-event.use-case';
import { type EventEmitter } from '@/core/event';
import { mock, type MockProxy } from 'jest-mock-extended';
import { ScanTrackingEvent, type ScanTrackingEventData } from '../../event/scan-tracking.event';

describe('DispatchTrackingEventUseCase', () => {
	let useCase: DispatchTrackingEventUseCase;
	let mockEventEmitter: MockProxy<EventEmitter>;

	const mockEventData: ScanTrackingEventData = {
		userId: 'user-123',
		url: 'https://example.com',
		userAgent: 'Mozilla/5.0',
		hostname: 'example.com',
		language: 'en-US',
		referrer: '',
		ip: '127.0.0.1',
		deviceType: 'desktop',
		browserName: 'Chrome',
	};

	beforeEach(() => {
		mockEventEmitter = mock<EventEmitter>();
		useCase = new DispatchTrackingEventUseCase(mockEventEmitter);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should emit a ScanTrackingEvent', () => {
		useCase.execute(mockEventData);

		expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
		expect(mockEventEmitter.emit).toHaveBeenCalledWith(expect.any(ScanTrackingEvent));
	});

	it('should pass event data to the ScanTrackingEvent', () => {
		useCase.execute(mockEventData);

		const [emittedEvent] = mockEventEmitter.emit.mock.calls[0];
		expect((emittedEvent as ScanTrackingEvent).data).toEqual(mockEventData);
	});

	it('should emit event synchronously', () => {
		// execute returns void (not a Promise)
		const result = useCase.execute(mockEventData);

		expect(result).toBeUndefined();
		expect(mockEventEmitter.emit).toHaveBeenCalled();
	});
});
