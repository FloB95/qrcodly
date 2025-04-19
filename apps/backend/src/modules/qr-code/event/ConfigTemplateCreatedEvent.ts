import { AbstractEvent } from '@/core/event/AbstractEvent';
import { type TConfigTemplate } from '../domain/entities/ConfigTemplate';

/**
 * Event triggered when a Config Template is created.
 */
export class ConfigTemplateCreatedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'ConfigTemplateCreated';

	constructor(public readonly configTemplate: TConfigTemplate) {
		super();
	}

	eventName(): string {
		return ConfigTemplateCreatedEvent.eventName;
	}
}
