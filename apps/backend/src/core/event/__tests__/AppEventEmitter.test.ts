import 'reflect-metadata';
import { container } from 'tsyringe';
import { EventEmitter } from '../EventEmitter';
import { AbstractEvent } from '../AbstractEvent';

/**
 * A test event that extends AbstractEvent.
 */
class TestEvent extends AbstractEvent {
	constructor(public message: string) {
		super();
	}

	eventName(): string {
		return 'test-event';
	}
}

describe('AppEventEmitter', () => {
	const eventEmitter = container.resolve(EventEmitter);

	afterEach(() => {
		jest.clearAllMocks(); // Clear mocks after each test
	});

	it('should emit an event and call listeners', () => {
		const mockListener = jest.fn();

		eventEmitter.on<TestEvent>('test-event', mockListener);

		const testEvent = new TestEvent('Hello, Event!');
		eventEmitter.emit(testEvent);

		expect(mockListener).toHaveBeenCalledWith(testEvent);
	});

	it('should register a listener and receive emitted events', () => {
		const receivedEvents: TestEvent[] = [];
		eventEmitter.on<TestEvent>('test-event', (event) => {
			receivedEvents.push(event);
		});

		const event1 = new TestEvent('Event 1');
		const event2 = new TestEvent('Event 2');

		eventEmitter.emit(event1);
		eventEmitter.emit(event2);

		expect(receivedEvents).toEqual([event1, event2]);
	});

	it('should allow multiple listeners for the same event', () => {
		const mockListener1 = jest.fn();
		const mockListener2 = jest.fn();

		eventEmitter.on<TestEvent>('test-event', mockListener1);
		eventEmitter.on<TestEvent>('test-event', mockListener2);

		const testEvent = new TestEvent('Multiple Listeners');

		eventEmitter.emit(testEvent);

		expect(mockListener1).toHaveBeenCalledWith(testEvent);
		expect(mockListener2).toHaveBeenCalledWith(testEvent);
	});

	it('should not trigger listeners for unrelated events', () => {
		const mockListener = jest.fn();

		eventEmitter.on<TestEvent>('different-event', mockListener);

		const testEvent = new TestEvent('This should not be received');
		eventEmitter.emit(testEvent);

		expect(mockListener).not.toHaveBeenCalled();
	});

	it('should correctly use eventName from AbstractEvent', () => {
		const mockListener = jest.fn();

		eventEmitter.on<TestEvent>('test-event', mockListener);

		const testEvent = new TestEvent('Event Name Test');

		// Emit event using its eventName() dynamically
		eventEmitter.emit({ ...testEvent, eventName: () => testEvent.eventName() });

		expect(mockListener).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Event Name Test' }),
		);
	});
});
