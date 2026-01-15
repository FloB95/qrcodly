import { AbstractEvent } from '@/core/event/abstract.event';
import { type TConfigTemplate } from '../domain/entities/config-template.entity';

/**
 * Event triggered when a Config Template is updated.
 */
export class ConfigTemplateUpdatedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'ConfigTemplateUpdated';

	constructor(public readonly configTemplate: TConfigTemplate) {
		super();
	}

	eventName(): string {
		return ConfigTemplateUpdatedEvent.eventName;
	}
}
