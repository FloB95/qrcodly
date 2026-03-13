import { inject, singleton } from 'tsyringe';
import { type IFileStorage } from '../interface/file-storage.interface';
import { GetObjectCommand, S3, type GetObjectOutput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { DEFAULT_PUBLIC_LINK_LIFETIME, IN_TEST } from '../config/constants';
import { Logger } from '../logging';
import { Readable } from 'stream';
import { streamToBuffer } from '@/utils/general';
import { S3DeleteError, S3FetchError, S3SignedUrlError, S3UploadError } from '../error/s3';
import { OnShutdown } from '../decorators/on-shutdown.decorator';
import { withRetry } from '@/core/utils/with-retry';

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

@singleton()
export class ObjectStorage implements IFileStorage {
	private s3Client!: S3;
	private bucketName!: string;
	private prefix = IN_TEST ? 'test/' : '';

	constructor(@inject(Logger) private logger: Logger) {
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
			this.bucketName = env.S3_BUCKET_NAME;
		} catch (e: any) {
			this.logger.error('error.initializing.S3.client', {
				error: e,
			});
		}
	}

	async get(key: string): Promise<Buffer | null> {
		const k = this.prefix + key;
		try {
			const response: GetObjectOutput = await this.s3Client.getObject({
				Bucket: this.bucketName,
				Key: k,
			});

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
			await withRetry(
				() =>
					this.s3Client.putObject({
						Bucket: this.bucketName,
						Key: k,
						Body: body,
						ContentType: contentType,
					}),
				{ maxRetries: 3, isRetryable: isRetryableS3Error },
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

	async delete(key: string): Promise<void> {
		const k = this.prefix + key;
		try {
			await this.s3Client.deleteObject({
				Bucket: this.bucketName,
				Key: k,
			});
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

			const url = await getSignedUrl(this.s3Client, command, { expiresIn });
			return url;
		} catch (error: unknown) {
			this.logger.error('error.generating.signed.url', { file: { key: k }, error });
			throw new S3SignedUrlError('Signed URL generation failed', error as Error);
		}
	}

	@OnShutdown()
	shutdown() {
		this.logger.debug('Shutting down S3 client');
		this.s3Client.destroy();
	}
}
