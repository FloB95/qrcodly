/** Unclaimed uploads older than this are removed by the sweep. */
export const STORED_FILE_ORPHAN_MAX_AGE_HOURS = 24;
/**
 * Released files a user keeps within the retention period. Beyond this the oldest are purged
 * first, so swapping files over and over cannot fill the storage.
 */
export const STORED_FILE_RETAINED_MAX = 30;
