/**
 * Abstract class for event handlers.
 */
export abstract class AbstractEventHandler<T> {
	/**
	 * Handles the event.
	 * @param {T} event The event to handle.
	 */
	abstract handle(event: T): Promise<void> | void;
}
