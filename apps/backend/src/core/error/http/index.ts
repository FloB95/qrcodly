import { BadRequestError } from './bad-request.error';
import { ConflictError } from './conflict.error';
import { CustomApiError } from './custom-api.error';
import { NotFoundError } from './not-found.error';
import { UnauthorizedError } from './unauthorized.error';
import { ForbiddenError } from './forbidden.error';
import { InsufficientScopeError } from './insufficient-scope.error';
import { ServiceUnavailableError } from './service-unavailable.error';
import { TokenTypeNotAllowedError } from './token-type-not-allowed.error';

export {
	CustomApiError,
	BadRequestError,
	ConflictError,
	NotFoundError,
	UnauthorizedError,
	ForbiddenError,
	InsufficientScopeError,
	ServiceUnavailableError,
	TokenTypeNotAllowedError,
};
