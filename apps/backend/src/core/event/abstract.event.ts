/**
 * Represents a Abstract event.
 */
export abstract class AbstractEvent {
	/**
	 * Gets the name of the event.
	 * @returns {string} The name of the event.
	 */
	abstract eventName(): string;
}
