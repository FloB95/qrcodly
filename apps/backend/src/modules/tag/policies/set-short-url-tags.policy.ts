import { type TUser } from '@/core/domain/schema/UserSchema';
import { UnauthorizedError } from '@/core/error/http';
import {
	MAX_TAGS_PER_RESOURCE,
	MaxTagsExceededError,
} from '@/modules/tag/error/http/max-tags-exceeded.error';
import { AbstractPolicy } from '@/core/policies/abstract.policy';

export class SetShortUrlTagsPolicy extends AbstractPolicy {
	constructor(
		private readonly user: TUser | undefined,
		private readonly requestedTagCount: number,
	) {
		super();
	}

	checkAccess(): true {
		if (!this.user) {
			throw new UnauthorizedError('You need to be logged in to manage tags.');
		}

		if (this.requestedTagCount > MAX_TAGS_PER_RESOURCE) {
			throw new MaxTagsExceededError();
		}

		return true;
	}
}
