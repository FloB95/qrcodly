/**
 * Interface for a key cache.
 */
export interface IKeyCache {
	/**
	 * Sets a value in the cache with an optional expiration time.
	 * @param key The key to set.
	 * @param value The value to set.
	 * @param expirationTimeSeconds The expiration time in seconds.
	 * @param tags Add Tags
	 * @returns A promise that resolves when the value is set.
	 */
	set(
		key: string,
		value: string | Buffer | number,
		expirationTimeSeconds?: number,
		tags?: string[],
	): Promise<void>;

	/**
	 * Retrieves a value from the cache.
	 * @param key The key to retrieve.
	 * @returns A promise that resolves to the retrieved value or null if not found.
	 */
	get(key: string): Promise<string | Buffer | number | null>;

	/**
	 * Deletes a value from the cache.
	 * @param key The key to delete.
	 * @returns A promise that resolves when the value is deleted.
	 */
	del(key: string): Promise<void>;

	/**
	 * Invalidates a cache tag, deleting all associated values.
	 * @param tag The tag to invalidate.
	 * @returns A promise that resolves when the tag is invalidated.
	 */
	invalidateTag(tag: string): Promise<void>;

	/**
	 * Disconnects from the cache.
	 */
	disconnect(): void;

	/**
	 * Returns the status of the cache.
	 * @returns The status of the cache.
	 */
	status(): string;
}
