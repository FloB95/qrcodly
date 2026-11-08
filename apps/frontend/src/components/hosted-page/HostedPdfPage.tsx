import { useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { TPublicHostedPdfPageDto } from '@shared/schemas';
import { cn } from '@/lib/utils';
import { hostedFileUrl } from '@/lib/api/hosted-page';
import { HostedPageShell } from './HostedPageShell';
import { resolveHostedTheme, STYLE_TOKENS } from './theme';
import { formatBytes } from './format';
import { HostedPageHeader } from './blocks/HostedPageHeader';
import {
	HostedLinkButton,
	HostedPrimaryButton,
	HostedSecondaryButton,
} from './blocks/HostedButtons';
import { HostedDocumentList, type HostedDocumentItem } from './blocks/HostedDocumentList';

type HostedPdfPageProps = {
	page: TPublicHostedPdfPageDto;
	preview?: boolean;
};

type DocumentLinks = { open: string; download: string };

/** Browser-facing document links; the API's absolute URLs are meant for API consumers. */
function documentLinks(
	page: TPublicHostedPdfPageDto,
	documentId: string | undefined,
): DocumentLinks {
	if (!page.shortCode || !documentId) return { open: '#', download: '#' };
	return {
		// relative: the page only renders on its own host, www and dev-by-IP included
		open: hostedFileUrl(`/u/${page.shortCode}`, documentId),
		download: hostedFileUrl(`/u/${page.shortCode}`, documentId, true),
	};
}

/**
 * A landing page around one or more documents, composed from the shared blocks in one of three
 * looks. One document gets a single big action; several become a list. Documents always open in
 * the browser's own viewer: the page is the same on a phone and on a desktop.
 */
export function HostedPdfPage({ page, preview }: HostedPdfPageProps) {
	const t = useTranslations('hostedPage.pdf');
	const { style } = resolveHostedTheme(page.theme);
	const tokens = STYLE_TOKENS[style];
	const single = page.documents.length === 1;
	const primary = page.documents[0];
	const primaryLinks = documentLinks(page, primary?.id);
	const items: HostedDocumentItem[] = page.documents.map((document) => {
		const links = documentLinks(page, document.id);
		return {
			id: document.id,
			title: document.title,
			// in the editor preview a document of size 0 is a stand-in the owner still has to upload
			meta:
				preview && document.fileSize === 0
					? t('uploadPending')
					: `PDF · ${formatBytes(document.fileSize)}`,
			openUrl: links.open,
			downloadUrl: links.download,
		};
	});

	const header = (
		<HostedPageHeader
			style={style}
			title={page.title}
			description={page.description}
			brandName={page.brandName}
			logoUrl={page.logoUrl}
			preview={preview}
		/>
	);
	// editorial stacks the buttons at every width; the other looks put them side by side when wide
	const sideBySide = style !== 'editorial';
	const actions = single && primary && (
		<div className={cn('flex flex-col gap-3', sideBySide && '@md:flex-row')}>
			<HostedPrimaryButton
				style={style}
				href={primaryLinks.open}
				external
				icon={<ArrowUpRightIcon className="size-4" aria-hidden="true" />}
				// a flex basis in a column would override the button height
				className={sideBySide ? '@md:flex-1' : undefined}
			>
				{page.buttonLabel || t('open')}
			</HostedPrimaryButton>
			<HostedSecondaryButton
				style={style}
				href={primaryLinks.download}
				icon={<ArrowDownTrayIcon className="size-4" aria-hidden="true" />}
			>
				{t('download')}
			</HostedSecondaryButton>
		</div>
	);
	const link = page.link && (
		<HostedLinkButton style={style} href={page.link.url}>
			{page.link.label}
		</HostedLinkButton>
	);
	const emptyHint = page.documents.length === 0 && preview && (
		<p className="rounded-lg border border-dashed border-[var(--hp-line)] px-4 py-6 text-center text-sm text-[var(--hp-text-muted)]">
			{t('noDocuments')}
		</p>
	);
	const fileLine = single && primary && (
		<p
			className={cn('text-xs text-[var(--hp-text-muted)]', style === 'editorial' && 'text-center')}
		>
			{primary.fileSize === 0 && preview
				? t('uploadPending')
				: `${primary.title} · PDF · ${formatBytes(primary.fileSize)}`}
		</p>
	);
	const list = !single && page.documents.length > 0 && (
		<HostedDocumentList
			style={style}
			items={items}
			openLabel={t('open')}
			downloadLabel={t('download')}
		/>
	);

	return (
		<HostedPageShell
			theme={page.theme}
			showBranding={page.showBranding}
			preview={preview}
			wide={style !== 'editorial'}
		>
			{style === 'editorial' && (
				<article>
					{page.coverUrl && (
						<div
							className={cn(
								'relative -mx-4 -mt-5 sm:mx-0 sm:mt-0 sm:overflow-hidden',
								tokens.radiusLarge,
								preview && '-mx-3 -mt-12',
							)}
						>
							{/* eslint-disable-next-line @next/next/no-img-element -- cover lives on the storage CDN */}
							<img
								src={page.coverUrl}
								alt=""
								className="aspect-[4/3] w-full object-cover @md:aspect-[2/1]"
							/>
							<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_45%,var(--hp-bg)_100%)]" />
						</div>
					)}
					<div className={cn('relative', page.coverUrl ? '-mt-10' : 'pt-6')}>{header}</div>
					<div className="mt-8 flex flex-col gap-3">
						{actions}
						{link}
					</div>
					{emptyHint && <div className="mt-6">{emptyHint}</div>}
					{list && <div className="mt-8">{list}</div>}
					{fileLine && <div className="mt-5">{fileLine}</div>}
				</article>
			)}

			{style === 'gallery' && (
				<article
					className={cn(
						'overflow-hidden bg-[var(--hp-surface)] shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] ring-1 ring-black/5',
						tokens.radiusLarge,
					)}
				>
					{page.coverUrl ? (
						<div className="p-3 pb-0">
							{/* eslint-disable-next-line @next/next/no-img-element -- cover lives on the storage CDN */}
							<img
								src={page.coverUrl}
								alt=""
								className={cn('aspect-[4/3] w-full object-cover @md:aspect-[16/9]', tokens.radius)}
							/>
						</div>
					) : (
						<div className="h-2 bg-[linear-gradient(90deg,var(--hp-primary),var(--hp-accent))]" />
					)}
					<div className="space-y-5 px-6 pt-6 pb-6 @md:px-8">
						{header}
						{actions}
						{link}
						{emptyHint}
						{fileLine}
					</div>
					{list && <div className="px-6 pb-6 @md:px-8">{list}</div>}
				</article>
			)}

			{style === 'technical' && (
				<article
					className={cn(
						'overflow-hidden bg-[var(--hp-surface)] ring-1 ring-[var(--hp-line)]',
						tokens.radiusLarge,
					)}
				>
					{page.coverUrl && (
						// full card width, like a product shot heading a data sheet
						// eslint-disable-next-line @next/next/no-img-element -- cover lives on the storage CDN
						<img
							src={page.coverUrl}
							alt=""
							className="aspect-[4/3] w-full border-b border-[var(--hp-line)] object-cover @md:aspect-[16/9]"
						/>
					)}
					<div className="space-y-4 px-5 pt-5 pb-5">
						{header}
						{primary && (
							<p className="font-hp-mono text-[11px] text-[var(--hp-text-muted)]">
								{page.documents.length}{' '}
								{page.documents.length === 1 ? t('document') : t('documentsTitle')}
							</p>
						)}
						{actions}
						{link}
						{emptyHint}
						{fileLine}
					</div>
					{list}
				</article>
			)}
		</HostedPageShell>
	);
}
