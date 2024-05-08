/**
 * Interface for a base key cache.
 */
export interface IBaseKeyCache {
  /**
   * Sets a value in the cache with an optional expiration time.
   * @param key The key to set.
   * @param value The value to set.
   * @param expirationTimeSeconds The expiration time in seconds.
   * @returns A promise that resolves when the value is set.
   */
  set(
    key: string,
    value: string | Buffer | number,
    expirationTimeSeconds?: number,
  ): Promise<void>

  /**
   * Retrieves a value from the cache.
   * @param key The key to retrieve.
   * @returns A promise that resolves to the retrieved value or null if not found.
   */
  get(key: string): Promise<string | Buffer | number | null>

  /**
   * Deletes a value from the cache.
   * @param key The key to delete.
   * @returns A promise that resolves when the value is deleted.
   */
  del(key: string): Promise<void>

  /**
   * Disconnects from the cache.
   */
  disconnect(): void
}
