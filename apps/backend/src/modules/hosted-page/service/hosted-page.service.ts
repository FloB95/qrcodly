import { randomUUID } from 'node:crypto';
import { inject, singleton } from 'tsyringe';
import { env } from '@/core/config/env';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '@/core/error/http';
import { type TUser } from '@/core/domain/schema/UserSchema';
import {
	addHostedUsage,
	emptyHostedUsage,
	getDirectDocumentId,
	getHostedFileRefs,
	getHostedFileRetention,
	getHostedOutboundUrls,
	getHostedUsage,
	isHostedPageContent,
	replaceHostedFileKey,
	sumHostedUsage,
	toHostedPageBody,
	withHostedDocumentIds,
	withHostedUploadMetadata,
	type THostedFileRef,
	type THostedFileRetention,
	type THostedPageBody,
	type THostedPageContent,
	type THostedPageType,
	type THostedUsage,
	type TQrCodeContent,
} from '@shared/schemas';
import { type TQrCode } from '@/modules/qr-code/domain/entities/qr-code.entity';
import { type TShortUrlWithDomain } from '@/modules/url-shortener/domain/entities/short-url.entity';
import ShortUrlRepository from '@/modules/url-shortener/domain/repository/short-url.repository';
import UrlSafetyIncidentRepository from '@/modules/url-shortener/domain/repository/url-safety-incident.repository';
import {
	URL_SAFETY_FIRST_CHECK_MINUTES,
	URL_SAFETY_MANUAL_THREAT_TYPE,
} from '@/modules/url-shortener/config/constants';
import { minutesFromNow } from '@/core/utils/date';
import { Logger } from '@/core/logging';
import { urlSafetyUnblocks } from '@/core/metrics';
import { buildShortUrl } from '@/modules/url-shortener/utils';
import {
	DestinationUrlSafetyService,
	type DestinationUrlSafetyContext,
} from '@/modules/url-shortener/service/destination-url-safety.service';
import StoredFileRepository from '@/modules/stored-file/domain/repository/stored-file.repository';
import { type TStoredFile } from '@/modules/stored-file/domain/entities/stored-file.entity';
import { STORED_FILE_RETAINED_MAX } from '@/modules/stored-file/config/constants';
import HostedPageRepository, {
	toHostedPageBody as bodyOf,
} from '../domain/repository/hosted-page.repository';
import { type THostedPage } from '../domain/entities/hosted-page.entity';
import { HostedFileService } from './hosted-file.service';
import { HostedPageEntitlementService } from './hosted-page-entitlement.service';
import { HostedPageCacheService } from './hosted-page-cache.service';
import { HostedPageLimitPolicy } from '../policies/hosted-page-limit.policy';
import { HostedUploadNotFoundError } from '../error/http/hosted-upload-not-found.error';
import { HostedPageNotFoundError } from '../error/http/hosted-page-not-found.error';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A document of a page, served by the frontend under the page's own address. */
export const hostedFileUrl = (pageUrl: string, documentId: string, download = false): string =>
	`${pageUrl}/file/${encodeURIComponent(documentId)}${download ? '?download=1' : ''}`;

/** A checked update of a page, applied later inside the caller's transaction. */
export type THostedPageUpdatePlan = {
	page: THostedPage;
	shortCode: string;
	shortUrlId: string;
	next: THostedPageContent;
	claims: THostedFileRef[];
};

const sameUrls = (a: string[], b: string[]) => a.join('\n') === b.join('\n');

/**
 * Hosted pages are their own entity: a page row, reached through the short URL that points at it,
 * owning its stored files. A QR code is one way to reach that address. Everything here works for
 * every page type through the shared registry (`HOSTED_PAGE_TYPE_DEFINITIONS`), never through
 * `content.type` checks. Checks run before a transaction, writes inside it.
 */
@singleton()
export class HostedPageService {
	constructor(
		@inject(StoredFileRepository) private readonly fileRepository: StoredFileRepository,
		@inject(HostedPageRepository) private readonly pageRepository: HostedPageRepository,
		@inject(HostedFileService) private readonly fileService: HostedFileService,
		@inject(HostedPageEntitlementService)
		private readonly entitlementService: HostedPageEntitlementService,
		@inject(HostedPageCacheService) private readonly cacheService: HostedPageCacheService,
		@inject(DestinationUrlSafetyService)
		private readonly urlSafetyService: DestinationUrlSafetyService,
		@inject(ShortUrlRepository) private readonly shortUrlRepository: ShortUrlRepository,
		@inject(UrlSafetyIncidentRepository)
		private readonly incidentRepository: UrlSafetyIncidentRepository,
		@inject(Logger) private readonly logger: Logger,
	) {}

	/**
	 * What a scan of this link should do: serve its hosted page, or open a document itself when
	 * the owner chose to skip the page. An offline page is always served as a page, which then
	 * tells the visitor it is unavailable.
	 */
	async resolveScanTarget(
		link: TShortUrlWithDomain,
	): Promise<{ hostedType: THostedPageType | null; destinationUrl?: string; hostedUrl?: string }> {
		if (!link.hostedPageId) return { hostedType: null };
		const page = await this.pageRepository.findLiveById(link.hostedPageId);
		if (!page) return { hostedType: null };

		const pageUrl = buildShortUrl(link.shortCode, link.customDomain?.domain ?? null);
		const documentId = getDirectDocumentId(bodyOf(page));
		if (documentId && (await this.entitlementService.isServing(page.createdBy))) {
			return { hostedType: null, destinationUrl: hostedFileUrl(pageUrl, documentId) };
		}
		return { hostedType: page.type, destinationUrl: pageUrl, hostedUrl: pageUrl };
	}

	/**
	 * Checks a new hosted QR code before anything is written: login, file ownership and the plan
	 * limits. Documents get their stable ids and file metadata comes from the stored files.
	 */
	async prepareForCreate(
		content: TQrCodeContent,
		user: TUser | undefined,
	): Promise<TQrCodeContent> {
		if (!isHostedPageContent(content)) return content;
		if (!user) {
			throw new UnauthorizedError('You need to be logged in to create hosted pages');
		}

		const prepared = await this.withCheckedFiles(
			withHostedDocumentIds(content, randomUUID),
			user.id,
		);
		await this.assertWithinLimits(user.id, prepared);
		await this.assertLinksSafe(prepared, user.id, 'create');
		return prepared;
	}

	async assertCanDuplicate(content: TQrCodeContent, user: TUser): Promise<void> {
		if (isHostedPageContent(content)) {
			await this.assertWithinLimits(user.id, content);
			await this.assertLinksSafe(content, user.id, 'duplicate');
		}
	}

	/** Creates the page of prepared hosted content and binds its files. Runs inside a transaction. */
	async createPage(content: THostedPageContent, userId: string): Promise<THostedPage> {
		const body = toHostedPageBody(content);
		const page = { id: randomUUID(), createdBy: userId, type: body.type, data: body.data };
		await this.pageRepository.create(page);
		for (const ref of getHostedFileRefs(body)) {
			await this.claim(ref, page.id);
		}
		return { ...page, createdAt: new Date(), updatedAt: null, deletedAt: null };
	}

	/**
	 * Checks a content update of the page a QR code shows, without writing: document ids, file
	 * ownership and metadata, and the plan limits with the current page counted as "before".
	 */
	async prepareUpdate(qrCode: TQrCode, next: THostedPageContent): Promise<THostedPageUpdatePlan> {
		if (!qrCode.createdBy) throw new HostedPageNotFoundError();
		const linked = await this.pageRepository.findLiveByQrCodeId(qrCode.id);
		if (!linked) throw new HostedPageNotFoundError();
		const { page, shortCode, shortUrlId } = linked;

		const checked = await this.withCheckedFiles(
			withHostedDocumentIds(next, randomUUID),
			qrCode.createdBy,
			page.id,
		);
		const current = bodyOf(page);
		await this.assertWithinLimits(qrCode.createdBy, checked, { pageId: page.id, body: current });
		// only new buttons: those already on the page are the re-check's, as for a redirect
		await this.assertLinksSafe(checked, qrCode.createdBy, 'update', getHostedOutboundUrls(current));

		return {
			page,
			shortCode,
			shortUrlId,
			next: checked,
			// every current file is claimed again, so a moved document or a changed role is recorded
			claims: getHostedFileRefs(checked),
		};
	}

	/**
	 * Writes a checked update inside the caller's transaction. The page is locked and read again,
	 * so a save that raced this one is released against what that save actually wrote. Returns
	 * whether a safety block of the page's link was lifted, for `afterChange` to report.
	 */
	async applyUpdate(plan: THostedPageUpdatePlan): Promise<boolean> {
		const locked = await this.pageRepository.findLiveByIdForUpdate(plan.page.id);
		if (!locked) throw new HostedPageNotFoundError();
		const current = bodyOf(locked);
		const nextKeys = new Set(plan.claims.map((ref) => ref.key));
		const retention = getHostedFileRetention(current);

		for (const ref of plan.claims) {
			await this.claim(ref, plan.page.id);
		}
		for (const ref of getHostedFileRefs(current)) {
			if (!nextKeys.has(ref.key)) await this.releaseFile(ref.key, retention);
		}
		await this.pageRepository.updateData(plan.page.id, toHostedPageBody(plan.next).data);

		const previousUrls = getHostedOutboundUrls(current);
		if (sameUrls(previousUrls, getHostedOutboundUrls(plan.next))) return false;
		return this.rescreenLinks(plan.shortUrlId, previousUrls, plan.next);
	}

	/**
	 * Changed link buttons go back into the re-check queue. A safety block is lifted only once every
	 * button it could stem from is gone, as when a redirect gets a new destination (the link stays
	 * switched off); while one of them is still there, the re-check decides. A block from a manual
	 * abuse review is never touched. The link row is locked, so a ban committing meanwhile wins.
	 */
	private async rescreenLinks(
		shortUrlId: string,
		previousUrls: string[],
		content: THostedPageContent,
	): Promise<boolean> {
		const link = await this.shortUrlRepository.findOneByIdForUpdate(shortUrlId);
		if (!link) return false;
		if (link.safetyStatus !== 'blocked') {
			await this.scheduleLinkCheck(shortUrlId, content);
			return false;
		}
		if (link.safetyThreatTypes?.includes(URL_SAFETY_MANUAL_THREAT_TYPE)) return false;
		if (getHostedOutboundUrls(content).some((url) => previousUrls.includes(url))) {
			await this.shortUrlRepository.scheduleSafetyCheck(
				shortUrlId,
				minutesFromNow(URL_SAFETY_FIRST_CHECK_MINUTES),
			);
			return false;
		}
		await this.shortUrlRepository.clearSafetyBlock(shortUrlId, null);
		await this.incidentRepository.resolveForShortUrl(shortUrlId);
		await this.scheduleLinkCheck(shortUrlId, content);
		return true;
	}

	/** The page's link buttons, screened by the safety re-check of its short URL. */
	async outboundUrlsOf(pageId: string): Promise<string[]> {
		const page = await this.pageRepository.findLiveById(pageId);
		return page ? getHostedOutboundUrls(bodyOf(page)) : [];
	}

	/** Link buttons are re-checked like a redirect destination; a page without any leaves the queue. */
	async scheduleLinkCheck(
		shortUrlId: string,
		content: THostedPageContent | THostedPageBody,
	): Promise<void> {
		const due = getHostedOutboundUrls(content).length
			? minutesFromNow(URL_SAFETY_FIRST_CHECK_MINUTES)
			: null;
		await this.shortUrlRepository.scheduleSafetyCheck(shortUrlId, due);
	}

	/** Deletes a page together with its link's QR code: kept for the retention period, files released. */
	async deletePage(pageId: string): Promise<THostedPage | undefined> {
		// locked like a save, so a save that commits first is released against what it wrote
		const page = await this.pageRepository.findLiveByIdForUpdate(pageId);
		if (!page) return undefined;
		const body = bodyOf(page);
		const retention = getHostedFileRetention(body);
		await this.pageRepository.softDelete(page.id);
		for (const ref of getHostedFileRefs(body)) {
			await this.releaseFile(ref.key, retention);
		}
		return page;
	}

	/**
	 * After a committed change: cap the user's retained files, drop the cached page and report a
	 * lifted safety block (only now, so a rolled-back save never counts as one).
	 */
	async afterChange(
		userId: string,
		shortCode?: string,
		unblocked?: { shortUrlId: string },
	): Promise<void> {
		await this.fileRepository.purgeOldestRetained(userId, STORED_FILE_RETAINED_MAX);
		if (shortCode) await this.cacheService.invalidateShortCode(shortCode);
		if (unblocked) {
			urlSafetyUnblocks.add(1, { reason: 'links_changed' });
			this.logger.info('url_safety.unblocked', {
				shortUrlId: unblocked.shortUrlId,
				shortCode,
				reason: 'links_changed',
			});
		}
	}

	/**
	 * Copies every referenced file into fresh keys so a duplicate never shares storage with the
	 * source. Runs before the transaction; the rows stay unowned until the new page claims them.
	 * Each new key lands in `copiedKeys` as soon as its row exists, so the caller can discard every
	 * copy when the duplicate fails, even halfway through this loop.
	 */
	async copyFilesForDuplicate(
		content: TQrCodeContent,
		userId: string,
		copiedKeys: string[],
	): Promise<TQrCodeContent> {
		let copy = content;

		for (const ref of getHostedFileRefs(content)) {
			const source = await this.fileRepository.findByFileKey(ref.key);
			const newKey = this.fileService.copyKeyFor(ref.key, userId);
			// the row comes first: an object without one would be invisible to every cleanup
			await this.fileRepository.create({
				id: randomUUID(),
				userId,
				ownerType: null,
				ownerId: null,
				kind: ref.kind,
				slot: null,
				itemId: null,
				fileKey: newKey,
				fileName: source?.fileName ?? newKey.slice(newKey.lastIndexOf('/') + 1),
				fileSize: source?.fileSize ?? 0,
				contentType: source?.contentType ?? 'application/octet-stream',
				claimedAt: null,
				releasedAt: null,
				purgeAfter: null,
				createdAt: new Date(),
			});
			copiedKeys.push(newKey);
			await this.fileService.copy(ref.key, newKey);
			copy = replaceHostedFileKey(copy, ref.key, newKey);
		}

		return copy;
	}

	/**
	 * Deletes a file nobody ever used, e.g. a copy left over from a failed duplicate. The row only
	 * goes once storage confirmed the delete; otherwise it stays for the sweep, which retries both.
	 */
	async discardFile(fileKey: string): Promise<void> {
		try {
			await this.fileService.deleteOrThrow(fileKey);
			await this.fileRepository.deleteByFileKey(fileKey);
		} catch (error) {
			// whatever is left is an unclaimed row, which the sweep removes together with its object
			this.logger.warn('hostedPage.file.discard.failed', { file: { key: fileKey }, error });
		}
	}

	/** What the user's live pages take from the plan, optionally leaving the page of one QR code out. */
	async getUsage(userId: string, excludeQrCodeId?: string): Promise<THostedUsage> {
		const excluded = excludeQrCodeId
			? await this.pageRepository.findLiveByQrCodeId(excludeQrCodeId)
			: undefined;
		return sumHostedUsage(await this.pageRepository.findBodiesByUser(userId, excluded?.page.id));
	}

	/** Link buttons on a page are screened by Web Risk, like a dynamic QR code's destination. */
	private async assertLinksSafe(
		content: THostedPageContent,
		userId: string,
		context: DestinationUrlSafetyContext,
		known: string[] = [],
	): Promise<void> {
		for (const url of getHostedOutboundUrls(content)) {
			if (known.includes(url)) continue;
			await this.urlSafetyService.assertDestinationUrlSafe(url, userId, context);
		}
	}

	private async claim(ref: THostedFileRef, pageId: string): Promise<void> {
		const claimed = await this.fileRepository.claim(
			ref.key,
			{ type: 'hosted_page', id: pageId },
			{ slot: ref.slot, itemId: ref.documentId },
		);
		if (!claimed) {
			throw new BadRequestError('The referenced file is already used by another page');
		}
	}

	private async releaseFile(fileKey: string, retention: THostedFileRetention): Promise<void> {
		const purgeAfter =
			retention === 'forever'
				? null
				: new Date(Date.now() + env.HOSTED_FILE_RETENTION_DAYS * DAY_MS);
		await this.fileRepository.release(fileKey, purgeAfter);
	}

	/** Every referenced file is checked against its stored row, so names and sizes cannot be edited in. */
	private async withCheckedFiles<T extends THostedPageContent>(
		content: T,
		userId: string,
		pageId?: string,
	): Promise<T> {
		let checked = content;
		for (const ref of getHostedFileRefs(content)) {
			const file = await this.assertOwnedFile(ref, userId, pageId);
			checked = withHostedUploadMetadata(checked, file);
		}
		return checked;
	}

	/** `current` is the saved page of an edited code; a new page has none. */
	private async assertWithinLimits(
		userId: string,
		next: THostedPageContent,
		current?: { pageId: string; body: THostedPageBody },
	): Promise<void> {
		const [{ limits }, others] = await Promise.all([
			this.entitlementService.getLimits(userId),
			this.pageRepository.findBodiesByUser(userId, current?.pageId).then(sumHostedUsage),
		]);
		const before = addHostedUsage(
			others,
			current ? getHostedUsage(current.body) : emptyHostedUsage(),
		);
		const after = addHostedUsage(others, getHostedUsage(next));
		new HostedPageLimitPolicy(limits, before, after).checkAccess();
	}

	private async assertOwnedFile(
		ref: THostedFileRef,
		userId: string,
		pageId?: string,
	): Promise<TStoredFile> {
		// The key prefix carries the owner, so a foreign key is refused before any lookup
		if (!this.fileService.belongsTo(ref.key, userId)) {
			throw new ForbiddenError('The referenced file does not belong to you');
		}
		const file = await this.fileRepository.findByFileKey(ref.key);
		if (!file || file.userId !== userId || file.kind !== ref.kind) {
			throw new HostedUploadNotFoundError(ref.key);
		}
		if (file.ownerId && !(file.ownerType === 'hosted_page' && file.ownerId === pageId)) {
			throw new BadRequestError('The referenced file is already used by another page');
		}
		return file;
	}
}
