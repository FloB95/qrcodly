import { container } from 'tsyringe';
import { EventEmitter } from '@/core/event';
import { AbstractEventHandler } from '@/core/event/handler/abstract.event-handler';
import { AbstractEvent } from '@/core/event/abstract.event';
import { EventHandler } from '../event-handler.decorator';

class TestEvent extends AbstractEvent {
	static readonly eventName = 'TestEvent';

	constructor() {
		super();
	}

	/**
	 * Gets the name of the event.
	 * @returns {string} The name of the event.
	 */
	eventName(): string {
		return TestEvent.eventName;
	}
}

describe('EventHandler', () => {
	let eventEmitter: EventEmitter;

	beforeEach(() => {
		eventEmitter = container.resolve(EventEmitter);
		jest.spyOn(eventEmitter, 'on'); // Spy on the 'on' method of the EventEmitter instance

		// Ensure the EventEmitter is properly reset before each test
		jest.clearAllMocks();
	});

	it('should register a class as an event handler for a specific event', () => {
		@EventHandler(TestEvent.eventName)
		class TestEventHandler extends AbstractEventHandler<TestEvent> {
			handle() {}
		}

		container.resolve(TestEventHandler); // Ensure the handler is registered
		expect(eventEmitter.on).toHaveBeenCalledTimes(1); // Verify 'on' was called once
		expect(eventEmitter.on).toHaveBeenCalledWith(TestEvent.eventName, expect.any(Function)); // Verify correct arguments
	});

	it('should call the handler method when the event is emitted', () => {
		const handleMock = jest.fn();

		@EventHandler(TestEvent.eventName)
		class TestEventHandler extends AbstractEventHandler<TestEvent> {
			handle(event: TestEvent) {
				handleMock(event);
			}
		}

		const testEvent = new TestEvent();
		container.resolve(TestEventHandler); // Ensure handler is registered

		// Emit the event and verify the handler is called
		eventEmitter.emit(testEvent);

		expect(handleMock).toHaveBeenCalledTimes(1);
		expect(handleMock).toHaveBeenCalledWith(testEvent);
	});

	it('should throw an error if the class does not extend AbstractEventHandler', () => {
		expect(() => {
			@EventHandler(TestEvent.eventName)
			class InvalidHandler {
				handle() {}
			}

			new InvalidHandler();
		}).toThrow('Class InvalidHandler must extend AbstractEventHandler to use "EventHandler"');
	});
});
