import { EventEmitter as NodeEventEmitter } from 'events';
import { singleton } from 'tsyringe';
import { type AbstractEvent } from './abstract.event';
import { type IEventEmitter } from '../interface/event-emitter.interface';
import { OnShutdown } from '../decorators/on-shutdown.decorator';

/**
 * AppEventEmitter class for emitting and listening to events using Node.js EventEmitter.
 */
@singleton()
export class EventEmitter implements IEventEmitter {
	private emitter: NodeEventEmitter;

	constructor() {
		this.emitter = new NodeEventEmitter();
	}

	emit(event: AbstractEvent) {
		this.emitter.emit(event.eventName(), event);
	}

	on<T>(eventName: string, listener: (event: T) => void): void {
		this.emitter.on(eventName, listener);
	}

	off<T>(eventName: string, listener: (event: T) => void): void {
		this.emitter.off(eventName, listener);
	}

	@OnShutdown()
	onShutdown() {
		this.emitter.removeAllListeners();
	}
}
