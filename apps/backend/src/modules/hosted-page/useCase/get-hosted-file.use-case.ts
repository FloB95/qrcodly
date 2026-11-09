import { inject, injectable } from 'tsyringe';
import { createHash } from 'node:crypto';
import { IBaseUseCase } from '@/core/interface/base-use-case.interface';
import { env } from '@/core/config/env';
import { type TByteRange, type TObjectStream } from '@/core/storage';
import { getHostedServedFiles } from '@shared/schemas';
import { buildShortUrl, isHostOf } from '@/modules/url-shortener/utils';
import StoredFileRepository from '@/modules/stored-file/domain/repository/stored-file.repository';
import { type TStoredFile } from '@/modules/stored-file/domain/entities/stored-file.entity';
import { toHostedPageBody } from '../domain/repository/hosted-page.repository';
import { GetPublicHostedPageUseCase } from './get-public-hosted-page.use-case';
import { HostedFileService } from '../service/hosted-file.service';
import { HostedPageNotFoundError } from '../error/http/hosted-page-not-found.error';

/** A file resolved for its page and host, not read from storage yet. */
export type TResolvedHostedFile = Pick<
	TStoredFile,
	'fileKey' | 'visibility' | 'fileName' | 'fileSize' | 'contentType'
> & {
	/** Changes whenever the owner swaps the file, so browsers revalidate cheaply. */
	etag: string;
};

/**
 * A file of a hosted page, for the frontend that serves it under the page's own address. It is only
 * handed out for that address (another customer's domain, a brand host get 404) and while the page
 * is live; type, size and storage come from the stored file, which must belong to the page.
 */
@injectable()
export class GetHostedFileUseCase implements IBaseUseCase {
	constructor(
		@inject(GetPublicHostedPageUseCase)
		private readonly getPublicHostedPageUseCase: GetPublicHostedPageUseCase,
		@inject(StoredFileRepository) private readonly fileRepository: StoredFileRepository,
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
		const { page, shortUrl } = await this.getPublicHostedPageUseCase.resolveActivePage(shortCode);
		const pageUrl = buildShortUrl(shortUrl.shortCode, shortUrl.customDomain?.domain ?? null);
		// phones on the local network reach the dev server by IP
		if (env.NODE_ENV !== 'development' && !isHostOf(pageUrl, host)) {
			throw new HostedPageNotFoundError();
		}

		const served = getHostedServedFiles(toHostedPageBody(page)).find(
			(entry) => entry.documentId === documentId,
		);
		const file = served && (await this.fileRepository.findByFileKey(served.fileKey));
		if (!file || file.ownerType !== 'hosted_page' || file.ownerId !== page.id) {
			throw new HostedPageNotFoundError();
		}

		return {
			fileKey: file.fileKey,
			visibility: file.visibility,
			fileName: file.fileName,
			fileSize: file.fileSize,
			contentType: file.contentType,
			etag: this.etagFor(file.fileKey),
		};
	}

	async open(file: TResolvedHostedFile, range?: TByteRange): Promise<TObjectStream> {
		const stored = await this.fileService.getStream(file, range);
		if (!stored) throw new HostedPageNotFoundError();
		return stored;
	}
}
