import { inject, injectable } from 'tsyringe';
import { createHash } from 'node:crypto';
import { type Readable } from 'node:stream';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { env } from '@/core/config/env';
import {
	getHostedServedFiles,
	type THostedPageBody,
	type THostedServedFile,
} from '@shared/schemas';
import { buildShortUrl, isHostOf } from '@/modules/url-shortener/utils';
import { toHostedPageBody } from '../domain/repository/hosted-page.repository';
import { GetPublicHostedPageUseCase } from './get-public-hosted-page.use-case';
import { HostedFileService } from '../service/hosted-file.service';
import { HostedPageNotFoundError } from '../error/http/hosted-page-not-found.error';

export type THostedFileInfo = {
	fileName: string;
	fileSize: number;
	contentType: string;
	/** Changes whenever the owner swaps the file, so browsers revalidate cheaply. */
	etag: string;
};

/** A file resolved for its page and host, not read from storage yet. */
export type TResolvedHostedFile = THostedFileInfo & { fileKey: string };

export type THostedStream = {
	body: Readable;
	/** Bytes as stored, when the storage reports it */
	contentLength?: number;
};

/**
 * A document of a hosted page, for the frontend that serves it under the page's own address. It is
 * only handed out for that address: another host (another customer's domain, a brand host) gets 404.
 */
@injectable()
export class GetHostedFileUseCase implements IBaseUseCase {
	constructor(
		@inject(GetPublicHostedPageUseCase)
		private readonly getPublicHostedPageUseCase: GetPublicHostedPageUseCase,
		@inject(HostedFileService) private readonly fileService: HostedFileService,
	) {}

	etagFor(fileKey: string): string {
		return `"${createHash('sha1').update(fileKey).digest('hex')}"`;
	}

	/**
	 * Resolves the file once per request; 304 and HEAD are answered from this without touching
	 * storage, and `open` streams it.
	 */
	async execute(
		shortCode: string,
		documentId: string,
		host?: string,
	): Promise<TResolvedHostedFile> {
		const file = await this.resolve(shortCode, documentId, host);
		return {
			fileKey: file.fileKey,
			fileName: file.fileName,
			fileSize: file.fileSize,
			contentType: file.contentType,
			etag: this.etagFor(file.fileKey),
		};
	}

	/** Streamed straight through: a large PDF never sits in memory as a whole. */
	async open(file: TResolvedHostedFile): Promise<THostedStream> {
		const stored = await this.fileService.getStream(file.fileKey);
		if (!stored) throw new HostedPageNotFoundError();
		return stored;
	}

	private async resolve(
		shortCode: string,
		documentId: string,
		host?: string,
	): Promise<THostedServedFile> {
		const { page, shortUrl } = await this.getPublicHostedPageUseCase.resolveActivePage(shortCode);
		const pageUrl = buildShortUrl(shortUrl.shortCode, shortUrl.customDomain?.domain ?? null);
		// phones on the local network reach the dev server by IP
		if (env.NODE_ENV !== 'development' && !isHostOf(pageUrl, host)) {
			throw new HostedPageNotFoundError();
		}
		return this.pick(toHostedPageBody(page), documentId);
	}

	private pick(page: THostedPageBody, documentId: string): THostedServedFile {
		const file = getHostedServedFiles(page).find((entry) => entry.documentId === documentId);
		if (!file) throw new HostedPageNotFoundError();
		return file;
	}
}
