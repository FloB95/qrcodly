import { inject, singleton } from 'tsyringe';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import {
	ObjectStorage,
	type TByteRange,
	type TObjectStream,
	type TStorageVisibility,
} from '@/core/storage';
import { type THostedUploadKind } from '@shared/schemas';
import { HOSTED_PAGE_FILE_FOLDER } from '../config/constants';
import { HostedFileTypeNotSupportedError } from '../error/http/hosted-file-type-not-supported.error';
import { HostedImageTooLargeError } from '../error/http/hosted-image-too-large.error';

export type TDetectedFileType = { contentType: string; extension: string };
/** The bytes that get stored for an upload, with their real type. */
export type TPreparedFile = TDetectedFileType & { buffer: Buffer };
/** Where a stored object lives: enough to read, copy or delete it. */
export type TStoredObject = { fileKey: string; visibility: TStorageVisibility };

/** Names of accepted types for error messages. */
const TYPE_LABELS: Record<string, string> = {
	'application/pdf': 'PDF',
	'image/png': 'PNG',
	'image/jpeg': 'JPEG',
	'image/webp': 'WebP',
};

/** Detected types stored as another: an animated PNG is a PNG whose first frame is kept. */
const TYPE_ALIASES: Record<string, TDetectedFileType> = {
	'image/apng': { contentType: 'image/png', extension: 'png' },
};

/** libvips messages about the input itself (corrupt or truncated data), not about the server. */
const DECODE_ERROR = /^(input |vipsjpeg|vipspng|vipswebp|\w+load)/i;

/** Longest edge of a stored image; covers and photos never need more on a phone. */
const IMAGE_MAX_EDGE = 1600;
/** Decoding limit: a small file can declare huge dimensions and take gigabytes to decode. */
const IMAGE_MAX_MEGAPIXELS = 40;

type TUploadKindHandling = {
	/** MIME types the kind accepts, as detected from the bytes; the declared type is never trusted */
	accepts: string[];
	/** Which bucket the kind's files go to; see `TStorageVisibility` */
	visibility: TStorageVisibility;
	/** Turns accepted bytes into what gets stored; kinds kept as uploaded store them unchanged */
	prepare?: (buffer: Buffer, type: TDetectedFileType) => Promise<TPreparedFile>;
};

/** Storage side of hosted pages. Keys live under a per-user prefix so ownership is visible in the key itself. */
@singleton()
export class HostedFileService {
	constructor(@inject(ObjectStorage) private readonly storage: ObjectStorage) {}

	/**
	 * How each upload kind is accepted and stored. A new kind (audio, video, office documents) adds
	 * its entry here (`file-type` knows video, audio and office formats). Files users bring as they
	 * are stay private; images are re-encoded, which makes them safe to hand to the CDN. The malware
	 * scan afterwards is the same for every kind.
	 */
	private readonly kinds: Record<THostedUploadKind, TUploadKindHandling> = {
		pdf: { accepts: ['application/pdf'], visibility: 'private' },
		image: {
			accepts: ['image/png', 'image/jpeg', 'image/webp'],
			visibility: 'public',
			prepare: (buffer, type) => this.normalizeImage(buffer, type),
		},
	};

	visibilityOf(kind: THostedUploadKind): TStorageVisibility {
		return this.kinds[kind].visibility;
	}

	async prepare(buffer: Buffer, kind: THostedUploadKind): Promise<TPreparedFile> {
		const handling = this.kinds[kind];
		const detected = await fileTypeFromBuffer(buffer);
		const type = detected
			? (TYPE_ALIASES[detected.mime] ?? { contentType: detected.mime, extension: detected.ext })
			: null;
		if (!type || !handling.accepts.includes(type.contentType)) {
			throw new HostedFileTypeNotSupportedError(
				handling.accepts.map((mime) => TYPE_LABELS[mime] ?? mime),
			);
		}
		if (handling.prepare) return handling.prepare(buffer, type);
		return { buffer, ...type };
	}

	/**
	 * Images are decoded and re-encoded rather than inspected: a file that is not a real image fails
	 * here, and whatever rode along in metadata or trailing bytes is gone. Only bytes detected as an
	 * accepted type reach the decoder; libvips would otherwise try every format it knows.
	 */
	private async normalizeImage(buffer: Buffer, type: TDetectedFileType): Promise<TPreparedFile> {
		const decode = () =>
			sharp(buffer, { failOn: 'error', limitInputPixels: IMAGE_MAX_MEGAPIXELS * 1_000_000 });
		const unsupported = () =>
			new HostedFileTypeNotSupportedError([TYPE_LABELS[type.contentType] ?? type.contentType]);

		let format: string | undefined;
		try {
			({ format } = await decode().metadata());
		} catch (error) {
			if (error instanceof Error && error.message.includes('pixel limit')) {
				throw new HostedImageTooLargeError(IMAGE_MAX_MEGAPIXELS);
			}
			throw unsupported();
		}
		if (`image/${format}` !== type.contentType) throw unsupported();

		const resized = decode().rotate().resize({
			width: IMAGE_MAX_EDGE,
			height: IMAGE_MAX_EDGE,
			fit: 'inside',
			withoutEnlargement: true,
		});
		try {
			const encoded =
				format === 'png'
					? await resized.png().toBuffer()
					: format === 'jpeg'
						? await resized.jpeg({ quality: 88 }).toBuffer()
						: await resized.webp({ quality: 88 }).toBuffer();
			return { buffer: encoded, ...type };
		} catch (error) {
			// broken pixel data is the file's fault; anything else (memory, a missing encoder) is ours
			if (error instanceof Error && DECODE_ERROR.test(error.message)) throw unsupported();
			throw error;
		}
	}

	/** An opaque owner segment instead of the Clerk user id, because public image URLs show the key. */
	userPrefix(userId: string): string {
		const owner = createHash('sha256').update(`hosted-owner:${userId}`).digest('hex').slice(0, 32);
		return `${HOSTED_PAGE_FILE_FOLDER}/${owner}/`;
	}

	buildKey(userId: string, extension: string): string {
		return `${this.userPrefix(userId)}${randomUUID()}.${extension}`;
	}

	belongsTo(fileKey: string, userId: string): boolean {
		return fileKey.startsWith(this.userPrefix(userId));
	}

	/** A fresh key of the same type for a copy of `sourceKey`, e.g. for a duplicated page. */
	copyKeyFor(sourceKey: string, userId: string): string {
		return this.buildKey(userId, sourceKey.slice(sourceKey.lastIndexOf('.') + 1));
	}

	async upload(file: TStoredObject, buffer: Buffer, contentType: string): Promise<void> {
		await this.storage.bucket(file.visibility).upload(file.fileKey, buffer, contentType);
	}

	/** Streamed straight through: a large file never sits in memory as a whole. */
	async getStream(file: TStoredObject, range?: TByteRange): Promise<TObjectStream | null> {
		return this.storage.bucket(file.visibility).getStream(file.fileKey, range);
	}

	/** Copies within the source's bucket; the copy keeps its visibility. */
	async copy(source: TStoredObject, destinationKey: string): Promise<void> {
		await this.storage.bucket(source.visibility).copy(source.fileKey, destinationKey);
	}

	/** For callers that may only drop the file's row once the object is gone. */
	async deleteOrThrow(file: TStoredObject): Promise<void> {
		await this.storage.bucket(file.visibility).delete(file.fileKey);
	}

	/** CDN URL of a public file. Private files have none: they are only served through their page. */
	getPublicUrl(file: TStoredObject): string | null {
		return file.visibility === 'public' ? this.storage.public.getPublicUrl(file.fileKey) : null;
	}
}
