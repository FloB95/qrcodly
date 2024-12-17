import { EventEmitter } from 'events'
import { BaseEvent } from '~/server/domain/events/BaseEvent'
import { IEventEmitter } from '~/server/domain/events/IEventEmitter'

/**
 * NodeEventEmitter class for emitting and listening to events using Node.js EventEmitter.
 */
export class NodeEventEmitter implements IEventEmitter {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter({
      captureRejections: true,
    })
  }

  /**
   * Emits an event.
   * @param event The event to emit.
   */
  emit(event: BaseEvent): void {
    this.emitter.emit(event.eventName(), event)
  }

  /**
   * Registers a listener for an event.
   * @param eventName The name of the event to listen for.
   * @param listener The listener function to be called when the event is emitted.
   */
  on<T>(eventName: string, listener: (event: T) => void): void {
    this.emitter.on(eventName, listener)
  }
}
