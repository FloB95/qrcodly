export interface IFileStorage {
	/**
	 * Upload a file to the storage.
	 * @param key The file path or key.
	 * @param data The file buffer or string data.
	 * @param contentType The MIME type of the file.
	 * @returns The public URL of the uploaded file.
	 */
	upload(key: string, data: Buffer | string, contentType?: string): Promise<void>;

	/**
	 * Retrieve a file from storage.
	 * @param key The file path or key.
	 * @returns The file buffer.
	 */
	get(key: string): Promise<Buffer | null>;

	/**
	 * Delete a file from storage.
	 * @param key The file path or key.
	 * @returns A promise that resolves when the file is deleted.
	 */
	delete(key: string): Promise<void>;

	/**
	 * Generate a signed URL (optional, for private files).
	 * @param key The file path or key.
	 * @param expiresIn Time in seconds before the URL expires.
	 * @returns A signed URL string.
	 */
	getSignedUrl(key: string, expiresIn?: number): Promise<string>;

	/**
	 * Build the public CDN URL for a key. Assumes the bucket is fronted by a
	 * public custom domain (e.g. cdn.qrcodly.de) and the key filename carries
	 * enough entropy to be unguessable.
	 * @param key The file path or key.
	 * @returns The public URL string.
	 */
	getPublicUrl(key: string): string;
}
