/**
 * Represents a base event.
 */
export abstract class BaseEvent {
  /**
   * Gets the name of the event.
   * @returns {string} The name of the event.
   */
  abstract eventName(): string;
}
