import { EventEmitter as NodeEventEmitter } from 'events';
import { singleton } from 'tsyringe';
import { type AbstractEvent } from './AbstractEvent';
import { type IEventEmitter } from '../interface/IEventEmitter';
import { OnShutdown } from '../decorators/OnShutdown';

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
