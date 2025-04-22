import { AbstractEvent } from '@/core/event/abstract.event';
import { type TConfigTemplate } from '../domain/entities/config-template.entity';

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
