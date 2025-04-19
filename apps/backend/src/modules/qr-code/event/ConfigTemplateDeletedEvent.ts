import { AbstractEvent } from '@/core/event/AbstractEvent';
import { type TConfigTemplate } from '../domain/entities/ConfigTemplate';

/**
 * Event triggered when a Config Template is deleted.
 */
export class ConfigTemplateDeletedEvent extends AbstractEvent {
	/**
	 * The name of the event.
	 */
	static readonly eventName = 'ConfigTemplateDeleted';

	constructor(public readonly configTemplate: TConfigTemplate) {
		super();
	}

	eventName(): string {
		return ConfigTemplateDeletedEvent.eventName;
	}
}
