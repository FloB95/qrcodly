import { type IListmonkRequestOptions } from '@/libs/listmonk';

/** The settings page waits for the answer, so listmonk calls fail fast instead of retrying */
export const SETTINGS_REQUEST: IListmonkRequestOptions = { interactive: true };

/** Clerk's maximum page size for the user listing */
export const CLERK_PAGE_SIZE = 500;

/** A reconciliation run deletes at most this many subscribers, or the share below if that is more */
export const MIN_DELETION_LIMIT = 10;
export const DELETION_LIMIT_SHARE = 0.01;
