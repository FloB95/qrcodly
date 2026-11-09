import { AbstractEvent } from '@/core/event/abstract.event';
import { type TCustomDomain } from '../domain/entities/custom-domain.entity';

/** A custom domain was removed; links that used it fall back to the default short URL domain. */
export class CustomDomainDeletedEvent extends AbstractEvent {
	static readonly eventName = 'CustomDomainDeleted';

	constructor(public readonly customDomain: TCustomDomain) {
		super();
	}

	eventName(): string {
		return CustomDomainDeletedEvent.eventName;
	}
}
