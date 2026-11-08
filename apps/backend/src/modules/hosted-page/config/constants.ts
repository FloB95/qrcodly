import { HOSTED_PAGE_PLAN_LIMITS } from '@/core/config/plan.config';

export const HOSTED_PAGE_FILE_FOLDER = 'hosted-pages';
/** Hard cap for the multipart parser: the largest file any plan may upload. Plan limits apply after. */
export const HOSTED_UPLOAD_HARD_LIMIT_BYTES = Math.max(
	...Object.values(HOSTED_PAGE_PLAN_LIMITS).flatMap((limits) =>
		Object.values(limits.maxFileSizeBytes),
	),
);
/** Uploads a user may have pending (not yet on a page) at once; caps storage abuse via the editor. */
export const HOSTED_UPLOAD_MAX_UNCLAIMED = 50;
export const HOSTED_PAGE_CACHE_TTL_SECONDS = 60;
export const HOSTED_PAGE_CACHE_KEY_PREFIX = 'hosted_page:';
export const HOSTED_PAGE_CACHE_USER_TAG_PREFIX = 'hosted_page_user:';
