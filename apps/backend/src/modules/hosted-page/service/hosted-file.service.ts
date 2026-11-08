import { inject, singleton } from 'tsyringe';
import { createHash, randomUUID } from 'node:crypto';
import { type Readable } from 'node:stream';
import sharp from 'sharp';
import { ObjectStorage } from '@/core/storage';
import { Logger } from '@/core/logging';
import { type THostedUploadKind } from '@shared/schemas';
import { HOSTED_PAGE_FILE_FOLDER } from '@/modules/hosted-page/config/constants';
import { HostedFileTypeNotSupportedError } from '../error/http/hosted-file-type-not-supported.error';

export type TDetectedFileType = { contentType: string; extension: string };
/** The bytes that get stored for an upload, with their real type. */
export type TPreparedFile = TDetectedFileType & { buffer: Buffer };

/** Longest edge of a stored image; covers and photos never need more on a phone. */
const IMAGE_MAX_EDGE = 1600;
const IMAGE_FORMATS = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const;

const PDF_MAGIC = Buffer.from('%PDF-');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

/** Storage side of hosted pages. Keys live under a per-user prefix so ownership is visible in the key itself. */
@singleton()
export class HostedFileService {
	constructor(
		@inject(ObjectStorage) private readonly objectStorage: ObjectStorage,
		@inject(Logger) private readonly logger: Logger,
	) {}

	/**
	 * How each upload kind becomes the bytes we store: its real type is taken from the bytes, never
	 * from the client. A new kind (audio, video, office documents) adds its entry here; the malware
	 * scan afterwards is the same for every kind.
	 */
	private readonly preparers: Record<
		THostedUploadKind,
		(buffer: Buffer) => Promise<TPreparedFile>
	> = {
		pdf: async (buffer) => ({ buffer, ...this.detectType(buffer, 'pdf') }),
		image: (buffer) => this.normalizeImage(buffer),
	};

	prepare(buffer: Buffer, kind: THostedUploadKind): Promise<TPreparedFile> {
		return this.preparers[kind](buffer);
	}

	/** Sniffs the real type from the first bytes; the declared MIME type is never trusted. */
	detectType(buffer: Buffer, kind: THostedUploadKind): TDetectedFileType {
		if (kind === 'pdf') {
			if (buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
				return { contentType: 'application/pdf', extension: 'pdf' };
			}
			throw new HostedFileTypeNotSupportedError(kind);
		}

		if (buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
			return { contentType: 'image/png', extension: 'png' };
		}
		if (buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
			return { contentType: 'image/jpeg', extension: 'jpg' };
		}
		if (
			buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
			buffer.subarray(8, 12).toString('ascii') === 'WEBP'
		) {
			return { contentType: 'image/webp', extension: 'webp' };
		}
		throw new HostedFileTypeNotSupportedError(kind);
	}

	/**
	 * Images are decoded and re-encoded rather than inspected: a file that is not a real
	 * PNG/JPEG/WebP fails here, and whatever rode along in metadata or trailing bytes is gone.
	 */
	async normalizeImage(buffer: Buffer): Promise<TPreparedFile> {
		// only PNG, JPEG and WebP bytes reach the decoder; libvips would otherwise try every format
		this.detectType(buffer, 'image');
		let format: keyof typeof IMAGE_FORMATS;
		try {
			const metadata = await sharp(buffer, { failOn: 'error' }).metadata();
			if (!metadata.format || !(metadata.format in IMAGE_FORMATS)) {
				throw new Error('unsupported');
			}
			format = metadata.format as keyof typeof IMAGE_FORMATS;
		} catch {
			throw new HostedFileTypeNotSupportedError('image');
		}

		const pipeline = sharp(buffer, { failOn: 'error' }).rotate().resize({
			width: IMAGE_MAX_EDGE,
			height: IMAGE_MAX_EDGE,
			fit: 'inside',
			withoutEnlargement: true,
		});
		const encoded =
			format === 'png'
				? await pipeline.png().toBuffer()
				: format === 'jpeg'
					? await pipeline.jpeg({ quality: 88 }).toBuffer()
					: await pipeline.webp({ quality: 88 }).toBuffer();

		return {
			buffer: encoded,
			contentType: IMAGE_FORMATS[format],
			extension: format === 'jpeg' ? 'jpg' : format,
		};
	}

	/**
	 * Keys carry an opaque owner segment instead of the Clerk user id, because image URLs are
	 * public. Keys from before the change still name the user id and keep working.
	 */
	userPrefix(userId: string): string {
		const owner = createHash('sha256').update(`hosted-owner:${userId}`).digest('hex').slice(0, 32);
		return `${HOSTED_PAGE_FILE_FOLDER}/${owner}/`;
	}

	private legacyUserPrefix(userId: string): string {
		return `${HOSTED_PAGE_FILE_FOLDER}/${userId}/`;
	}

	buildKey(userId: string, extension: string): string {
		return `${this.userPrefix(userId)}${randomUUID()}.${extension}`;
	}

	belongsTo(fileKey: string, userId: string): boolean {
		return (
			fileKey.startsWith(this.userPrefix(userId)) ||
			fileKey.startsWith(this.legacyUserPrefix(userId))
		);
	}

	async upload(fileKey: string, buffer: Buffer, contentType: string): Promise<void> {
		await this.objectStorage.upload(fileKey, buffer, contentType);
	}

	async get(fileKey: string): Promise<Buffer | null> {
		return this.objectStorage.get(fileKey);
	}

	async getStream(fileKey: string): Promise<{ body: Readable; contentLength?: number } | null> {
		return this.objectStorage.getStream(fileKey);
	}

	/** A fresh key of the same type for a copy of `sourceKey`, e.g. for a duplicated page. */
	copyKeyFor(sourceKey: string, userId: string): string {
		return this.buildKey(userId, sourceKey.slice(sourceKey.lastIndexOf('.') + 1));
	}

	async copy(sourceKey: string, destinationKey: string): Promise<void> {
		await this.objectStorage.copy(sourceKey, destinationKey);
	}

	/** Deleting is best effort: a missing object must never block a QR code deletion. */
	async delete(fileKey: string): Promise<void> {
		try {
			await this.deleteOrThrow(fileKey);
		} catch (error) {
			this.logger.error('hostedPage.file.delete.failed', { file: { key: fileKey }, error });
		}
	}

	/** For callers that may only drop the file's row once the object is gone. */
	async deleteOrThrow(fileKey: string): Promise<void> {
		if (!fileKey.startsWith(`${HOSTED_PAGE_FILE_FOLDER}/`)) {
			this.logger.warn('hostedPage.file.delete.outsideFolder', { file: { key: fileKey } });
			return;
		}
		await this.objectStorage.delete(fileKey);
	}

	getPublicUrl(fileKey: string): string {
		return this.objectStorage.getPublicUrl(fileKey);
	}
}
