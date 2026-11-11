import { Fragment } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
	HOSTED_DOCUMENT_CATEGORIES,
	hostedFileUrl,
	type TPublicHostedProductDocumentDto,
	type TPublicHostedProductPageDto,
	type TPublicHostedProductPartyDto,
} from '@shared/schemas';
import { cn } from '@/lib/utils';
import { HostedPageShell } from './HostedPageShell';
import { resolveHostedTheme, STYLE_TOKENS } from './theme';
import { formatBytes } from './format';
import { HostedPageHeader } from './blocks/HostedPageHeader';
import { HostedLinkButton } from './blocks/HostedButtons';
import { ProductDocuments, type ProductDocumentItem } from './blocks/ProductDocuments';
import { ProductPaperRequest } from './blocks/ProductPaperRequest';

type HostedProductPageProps = {
	page: TPublicHostedProductPageDto;
	preview?: boolean;
};

/**
 * The page behind a code on a machine or device: which model it is, its documents per language
 * with their earlier versions, the key safety information and who made it.
 */
const sameSiteFile = (url: string) => (url.startsWith('/') ? url : '#');

export function HostedProductPage({ page, preview }: HostedProductPageProps) {
	const t = useTranslations('hostedPage.product');
	const tPdf = useTranslations('hostedPage.pdf');
	const locale = useLocale();
	const { style } = resolveHostedTheme(page.theme);
	const tokens = STYLE_TOKENS[style];
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
	const languageName = new Intl.DisplayNames([locale], { type: 'language' }).of(locale) ?? locale;
	const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null);

	const toItem = (
		document: TPublicHostedProductDocumentDto,
		meta: (string | null)[],
	): ProductDocumentItem => ({
		id: document.id,
		category: document.category,
		language: document.language,
		title: document.title ?? t(`categories.${document.category}`),
		meta: meta.filter(Boolean).join(' · '),
		// relative: the page only renders on its own host, www and dev-by-IP included
		// without a short URL only a file of this site opens: the demo pages' sample document
		openUrl: page.shortCode
			? hostedFileUrl(`/u/${page.shortCode}`, document.id)
			: sameSiteFile(document.fileUrl),
		downloadUrl: page.shortCode
			? hostedFileUrl(`/u/${page.shortCode}`, document.id, true)
			: sameSiteFile(document.downloadUrl),
	});
	const documents = page.documents.map((document) => {
		const since = formatDate(document.validFrom);
		// in the editor preview a document of size 0 is a stand-in the owner still has to upload
		return toItem(
			document,
			preview && document.fileSize === 0
				? [tPdf('uploadPending')]
				: [
						`PDF · ${formatBytes(document.fileSize)}`,
						document.version,
						since && t('since', { date: since }),
					],
		);
	});
	const archive = page.archive.map((entry) =>
		toItem(entry, [
			entry.version,
			t('period', {
				from: formatDate(entry.validFrom) ?? '…',
				until: formatDate(entry.validUntil) ?? '…',
			}),
			`PDF · ${formatBytes(entry.fileSize)}`,
		]),
	);

	const facts = [
		[t('model'), page.model],
		[t('articleNumber'), page.articleNumber],
		[t('gtin'), page.gtin],
	].filter((fact): fact is [string, string] => Boolean(fact[1]));

	// a preview sits inside another page, whose outline must not gain these headings
	const Heading = preview ? 'p' : 'h2';

	const party = (label: string, value: TPublicHostedProductPartyDto) => (
		<section className="space-y-1">
			<Heading className={cn(tokens.eyebrow, 'text-[var(--hp-text-muted)]')}>{label}</Heading>
			<p className="font-semibold [overflow-wrap:anywhere]">{value.name}</p>
			<p className="text-sm [overflow-wrap:anywhere] whitespace-pre-line text-[var(--hp-text-muted)]">
				{value.address}
			</p>
			<p className="flex flex-col items-start gap-0.5 pt-1 text-sm">
				{value.email && (
					<a href={`mailto:${value.email}`} className="break-all underline underline-offset-2">
						{value.email}
					</a>
				)}
				{value.website && (
					<a
						href={value.website}
						target="_blank"
						rel="noopener"
						className="break-all underline underline-offset-2"
					>
						{value.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
					</a>
				)}
				{value.phone && (
					<a href={`tel:${value.phone.replace(/[^\d+]/g, '')}`} className="underline-offset-2">
						{value.phone}
					</a>
				)}
			</p>
		</section>
	);

	return (
		<HostedPageShell theme={page.theme} showBranding={page.showBranding} preview={preview} wide>
			<article
				className={cn(
					'overflow-hidden bg-[var(--hp-surface)] ring-1 ring-[var(--hp-line)]',
					tokens.radiusLarge,
				)}
			>
				{page.coverUrl && (
					// eslint-disable-next-line @next/next/no-img-element -- cover lives on the storage CDN
					<img
						referrerPolicy="no-referrer"
						src={page.coverUrl}
						alt=""
						className="aspect-[4/3] w-full border-b border-[var(--hp-line)] object-cover @md:aspect-[16/9]"
					/>
				)}
				<div className="space-y-5 px-5 pt-5 pb-5">
					<HostedPageHeader
						style={style}
						title={page.title}
						description={page.description}
						brandName={page.brandName}
						logoUrl={page.logoUrl}
						preview={preview}
					/>
					{facts.length > 0 && (
						<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							{facts.map(([label, value]) => (
								<Fragment key={label}>
									<dt className="text-[var(--hp-text-muted)]">{label}</dt>
									<dd className="font-hp-mono font-medium break-all">{value}</dd>
								</Fragment>
							))}
						</dl>
					)}
					{page.safetyNotice && (
						<aside
							className={cn(
								'flex gap-3 bg-[var(--hp-surface-2)] p-4 ring-1 ring-[var(--hp-line)] ring-inset',
								tokens.radiusLarge,
							)}
						>
							<ExclamationTriangleIcon
								className="mt-0.5 size-5 shrink-0 text-[var(--hp-ink)]"
								aria-hidden="true"
							/>
							<div className="min-w-0 space-y-1">
								<Heading className="text-sm font-semibold">{t('safety')}</Heading>
								<p className="text-sm [overflow-wrap:anywhere] whitespace-pre-line">
									{page.safetyNotice}
								</p>
							</div>
						</aside>
					)}
				</div>

				{documents.length === 0 && archive.length === 0 ? (
					preview && (
						<p className="mx-5 mb-5 rounded-lg border border-dashed border-[var(--hp-line)] px-4 py-6 text-center text-sm text-[var(--hp-text-muted)]">
							{tPdf('noDocuments')}
						</p>
					)
				) : (
					<ProductDocuments
						style={style}
						categories={HOSTED_DOCUMENT_CATEGORIES.map((id) => ({
							id,
							label: t(`categories.${id}`),
						}))}
						documents={documents}
						archive={archive}
						preferredLanguage={locale}
						preview={preview}
						languageLabel={t('language')}
						earlierLabel={t('earlierVersions')}
						openTemplate={tPdf.raw('openDocument') as string}
						downloadTemplate={tPdf.raw('downloadDocument') as string}
					/>
				)}

				<div className="space-y-5 border-t border-[var(--hp-line)] px-5 pt-5 pb-5">
					{page.link && (
						<HostedLinkButton style={style} href={page.link.url}>
							{page.link.label}
						</HostedLinkButton>
					)}
					{page.paperRequestEmail && page.documents.length > 0 && (
						<ProductPaperRequest
							style={style}
							email={page.paperRequestEmail}
							disabled={preview}
							button={t('paper.button')}
							hint={t('paper.hint', { email: page.paperRequestEmail })}
							subject={t('paper.subject', { model: page.model })}
							body={t('paper.body', {
								model: page.model,
								articleNumber: page.articleNumber ?? '–',
								language: languageName,
							})}
						/>
					)}
					{(page.manufacturer.name || page.manufacturer.address) &&
						party(t('manufacturer'), page.manufacturer)}
					{page.euRepresentative && party(t('euRepresentative'), page.euRepresentative)}
				</div>
			</article>
		</HostedPageShell>
	);
}
