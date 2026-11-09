import { inject, singleton } from 'tsyringe';
import { type IFileStorage } from '../interface/file-storage.interface';
import { CopyObjectCommand, GetObjectCommand, S3, type GetObjectOutput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { DEFAULT_PUBLIC_LINK_LIFETIME, IN_TEST } from '../config/constants';
import { Logger } from '../logging';
import { Readable } from 'stream';
import { streamToBuffer } from '@/utils/general';
import { S3DeleteError, S3FetchError, S3SignedUrlError, S3UploadError } from '../error/s3';
import { OnShutdown } from '../decorators/on-shutdown.decorator';
import { withRetry } from '@/core/utils/with-retry';
import { safely, storageOperationDuration, storageOperations } from '../metrics';

/** Times an S3 call. Retries are inside `fn`, so the duration is the caller-visible latency. */
async function track<T>(
	operation: string,
	bucket: TStorageVisibility,
	fn: () => Promise<T>,
): Promise<T> {
	const startedAt = Date.now();
	try {
		const result = await fn();
		safely(() => {
			storageOperationDuration.record(Date.now() - startedAt, { operation, bucket });
			storageOperations.add(1, { operation, bucket, outcome: 'ok' });
		});
		return result;
	} catch (error) {
		safely(() => {
			storageOperationDuration.record(Date.now() - startedAt, { operation, bucket });
			storageOperations.add(1, { operation, bucket, outcome: 'error' });
		});
		throw error;
	}
}

function isRetryableS3Error(error: unknown): boolean {
	if (error == null || typeof error !== 'object') return false;
	const err = error as Record<string, unknown>;

	// S3 OperationAborted (409 conflict on concurrent writes to same key)
	if (err.name === 'OperationAborted' || err.Code === 'OperationAborted') return true;

	// 5xx server errors
	const status = err.$metadata
		? (err.$metadata as Record<string, unknown>).httpStatusCode
		: err.statusCode;
	if (typeof status === 'number' && status >= 500) return true;

	// Network errors
	if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'EPIPE') return true;

	return false;
}

/** An inclusive byte range of an object, as in an HTTP `Range: bytes=start-end` header. */
export type TByteRange = { start: number; end: number };

export type TObjectStream = {
	body: Readable;
	/** Bytes in this response: the range when one was asked for, else the whole object */
	contentLength?: number;
};

/**
 * Where a file lives, decided by what may happen to it:
 * - `public`: the CDN bucket. Every object has a permanent public URL: images shown inline (QR code
 *   images and logos, hosted page images, which are re-encoded on upload).
 * - `private`: no public access at all. Objects have no URL; the app streams them after its own
 *   checks, so blocking, deleting or taking a page offline applies at once. For files users bring
 *   as they are (documents, later audio and video).
 */
export const STORAGE_VISIBILITIES = ['public', 'private'] as const;
export type TStorageVisibility = (typeof STORAGE_VISIBILITIES)[number];

/** One S3 bucket. Each bucket has its own client, so slow downloads from one never starve the other. */
export abstract class S3Bucket {
	protected s3Client!: S3;
	protected prefix = IN_TEST ? 'test/' : '';

	constructor(
		protected readonly logger: Logger,
		protected readonly bucketName: string,
		/** Which bucket this is, for metrics and logs */
		protected readonly visibility: TStorageVisibility,
	) {
		try {
			this.s3Client = new S3({
				endpoint: env.S3_ENDPOINT,
				region: env.S3_REGION,
				credentials: {
					accessKeyId: env.S3_UPLOAD_KEY,
					secretAccessKey: env.S3_UPLOAD_SECRET,
				},
				forcePathStyle: true,
			});
		} catch (e: any) {
			this.logger.error('error.initializing.S3.client', {
				error: e,
			});
		}
	}

	/**
	 * Streams an object (or a byte range of it) instead of buffering it, for responses that pass a
	 * file straight through. Returns null when the object has no readable body.
	 */
	async getStream(key: string, range?: TByteRange): Promise<TObjectStream | null> {
		const k = this.prefix + key;
		try {
			const response: GetObjectOutput = await track('get', this.visibility, () =>
				this.s3Client.getObject({
					Bucket: this.bucketName,
					Key: k,
					...(range && { Range: `bytes=${range.start}-${range.end}` }),
				}),
			);
			if (!response.Body || !(response.Body instanceof Readable)) return null;
			return { body: response.Body, contentLength: response.ContentLength };
		} catch (error: unknown) {
			this.logger.error('error.file.fetching', { file: { key: k }, error });
			if (error instanceof Error) {
				throw new S3FetchError('File fetch failed', error);
			}
			throw new S3FetchError('File fetch failed', new Error('Unknown error occurred'));
		}
	}

	async get(key: string): Promise<Buffer | null> {
		const k = this.prefix + key;
		try {
			const response: GetObjectOutput = await track('get', this.visibility, () =>
				this.s3Client.getObject({
					Bucket: this.bucketName,
					Key: k,
				}),
			);

			if (!response.Body || !(response.Body instanceof Readable)) {
				this.logger.warn('No readable body found in S3 response', {
					file: { key: k },
				});
				return null;
			}

			const buffer = await streamToBuffer(response.Body);
			return buffer;
		} catch (error: unknown) {
			this.logger.error('error.file.fetching', {
				file: {
					key: k,
				},
				error,
			});
			if (error instanceof Error) {
				throw new S3FetchError('File fetch failed', error);
			}
			throw new S3FetchError('File fetch failed', new Error('Unknown error occurred'));
		}
	}

	async upload(
		key: string,
		data: Buffer | string | Readable,
		contentType: string = 'application/octet-stream',
	): Promise<void> {
		const k = this.prefix + key;

		// Buffer streams before the retry loop so they can be replayed
		const body = data instanceof Readable ? await streamToBuffer(data) : data;

		try {
			await track('upload', this.visibility, () =>
				withRetry(
					() =>
						this.s3Client.putObject({
							Bucket: this.bucketName,
							Key: k,
							Body: body,
							ContentType: contentType,
						}),
					{ maxRetries: 3, isRetryable: isRetryableS3Error },
				),
			);
			this.logger.info('file.uploaded', {
				file: {
					key: k,
					contentType,
				},
			});
		} catch (error: unknown) {
			this.logger.error('error.file.uploaded', {
				file: {
					key: k,
					contentType,
				},
				error,
			});
			throw new S3UploadError('File upload failed', error as Error);
		}
	}

	async copy(sourceKey: string, destinationKey: string): Promise<void> {
		const src = this.prefix + sourceKey;
		const dest = this.prefix + destinationKey;
		try {
			await track('copy', this.visibility, () =>
				withRetry(
					() =>
						this.s3Client.send(
							new CopyObjectCommand({
								Bucket: this.bucketName,
								CopySource: `${this.bucketName}/${src}`,
								Key: dest,
							}),
						),
					{ maxRetries: 3, isRetryable: isRetryableS3Error },
				),
			);
			this.logger.info('file.copied', {
				file: { sourceKey: src, destinationKey: dest },
			});
		} catch (error: unknown) {
			this.logger.error('error.file.copied', {
				file: { sourceKey: src, destinationKey: dest },
				error,
			});
			throw new S3UploadError('File copy failed', error as Error);
		}
	}

	async delete(key: string): Promise<void> {
		const k = this.prefix + key;
		try {
			await track('delete', this.visibility, () =>
				this.s3Client.deleteObject({
					Bucket: this.bucketName,
					Key: k,
				}),
			);
			this.logger.info('file.deleted', {
				file: { key: k },
			});
		} catch (error: unknown) {
			this.logger.error('error.file.deleted', {
				file: { key: k },
				error,
			});
			throw new S3DeleteError('File deletion failed', error as Error);
		}
	}

	async emptyS3Directory(dir: string) {
		const listedObjects = await this.s3Client.listObjectsV2({
			Bucket: this.bucketName,
			Prefix: dir,
		});

		if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

		const deleteParams: { Bucket: string; Delete: { Objects: { Key: string }[] } } = {
			Bucket: this.bucketName,
			Delete: { Objects: [] },
		};

		listedObjects.Contents.forEach(({ Key }) => {
			if (!Key) return;
			deleteParams.Delete.Objects.push({ Key });
		});
		await this.s3Client.deleteObjects(deleteParams);
		if (listedObjects.IsTruncated) await this.emptyS3Directory(dir);
	}

	destroyClient() {
		this.logger.debug('Shutting down S3 client', { bucket: this.bucketName });
		this.s3Client.destroy();
	}
}

/** The CDN bucket (`S3_BUCKET_NAME`, served at `S3_PUBLIC_URL`). */
export class PublicBucket extends S3Bucket implements IFileStorage {
	getPublicUrl(key: string): string {
		const k = this.prefix + key;
		const base = env.S3_PUBLIC_URL.replace(/\/$/, '');
		return `${base}/${k}`;
	}

	async getSignedUrl(
		key: string,
		expiresIn: number | undefined = DEFAULT_PUBLIC_LINK_LIFETIME,
	): Promise<string> {
		const k = this.prefix + key;
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: k,
			});

			const url = await track('signed_url', this.visibility, () =>
				getSignedUrl(this.s3Client, command, { expiresIn }),
			);
			return url;
		} catch (error: unknown) {
			this.logger.error('error.generating.signed.url', { file: { key: k }, error });
			throw new S3SignedUrlError('Signed URL generation failed', error as Error);
		}
	}
}

/** The bucket without public access (`S3_PRIVATE_BUCKET_NAME`): read, stream, copy, delete; no URLs. */
export class PrivateBucket extends S3Bucket {}

/** The single entry to object storage: pick the bucket by name, or by a file's recorded visibility. */
@singleton()
export class ObjectStorage {
	readonly public: PublicBucket;
	readonly private: PrivateBucket;

	constructor(@inject(Logger) logger: Logger) {
		this.public = new PublicBucket(logger, env.S3_BUCKET_NAME, 'public');
		this.private = new PrivateBucket(logger, env.S3_PRIVATE_BUCKET_NAME, 'private');
	}

	bucket(visibility: TStorageVisibility): S3Bucket {
		if (visibility === 'public') return this.public;
		if (visibility === 'private') return this.private;
		// never fall back to the public bucket for a value we do not know
		throw new Error(`Unknown storage visibility: ${String(visibility)}`);
	}

	@OnShutdown()
	shutdown() {
		this.public.destroyClient();
		this.private.destroyClient();
	}
}
