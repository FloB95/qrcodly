import { inject, singleton } from 'tsyringe';
import { type IFileStorage } from '../interface/IFileStorage';
import {
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	S3,
	type GetObjectOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { DEFAULT_PUBLIC_LINK_LIFETIME } from '../config/constants';
import { Logger } from '../logging';
import { Readable } from 'stream';
import { streamToBuffer } from '@/utils/general';
import { S3DeleteError, S3FetchError, S3SignedUrlError, S3UploadError } from '../error/s3';
import { OnShutdown } from '../decorators/OnShutdown';

@singleton()
export class ObjectStorage implements IFileStorage {
	private s3Client!: S3;
	private bucketName!: string;

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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (e: any) {
			console.log('Error initializing S3 client', e);
		}
	}

	async get(key: string): Promise<Buffer | null> {
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			const response: GetObjectOutput = await this.s3Client.send(command);

			if (!response.Body || !(response.Body instanceof Readable)) {
				this.logger.warn('No readable body found in S3 response', { key });
				return null;
			}

			const buffer = await streamToBuffer(response.Body);
			return buffer;
		} catch (error: unknown) {
			this.logger.error('Error fetching file from S3', { key, error });
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
		try {
			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: key,
				Body: data,
				ContentType: contentType,
			});

			const res = await this.s3Client.send(command);
			this.logger.info('File uploaded to S3:', { key, contentType, res });
		} catch (error: unknown) {
			this.logger.error('Error uploading file to S3', { key, contentType, error });
			throw new S3UploadError('File upload failed', error as Error);
		}
	}

	async delete(key: string): Promise<void> {
		try {
			const command = new DeleteObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			await this.s3Client.send(command);
			this.logger.info('File deleted from S3:', { key });
		} catch (error: unknown) {
			this.logger.error('Error deleting file from S3', { key, error });
			throw new S3DeleteError('File deletion failed', error as Error);
		}
	}

	async getSignedUrl(
		key: string,
		expiresIn: number = DEFAULT_PUBLIC_LINK_LIFETIME,
	): Promise<string> {
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: key,
			});

			const url = await getSignedUrl(this.s3Client, command, { expiresIn });
			return url;
		} catch (error: unknown) {
			this.logger.error('Error generating signed URL', { key, error });
			throw new S3SignedUrlError('Signed URL generation failed', error as Error);
		}
	}

	@OnShutdown()
	shutdown() {
		this.logger.debug('Shutting down S3 client');
		this.s3Client.destroy();
	}
}
