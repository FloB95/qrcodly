'use client';

import { useLocale, useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import {
	hostedFileUrl,
	type THostedProductDocument,
	type TQrCodeWithRelationsResponseDto,
} from '@shared/schemas';
import { buttonVariants } from '@/components/ui/button';
import { useShortUrlLink } from '@/hooks/use-short-url-link';
import { formatBytes } from '@/components/hosted-page/format';
import { HostedPageCard } from './HostedPageCard';

export default function ProductContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.product');
	const tPdf = useTranslations('generator.contentSwitch.pdf');
	const tHosted = useTranslations('hostedPage.pdf');
	const tPage = useTranslations('hostedPage.product');
	const locale = useLocale();
	const { link: pageUrl } = useShortUrlLink(qrCode.shortUrl);
	if (qrCode.content.type !== 'product') return null;

	const data = qrCode.content.data;
	const shortCode = qrCode.shortUrl?.shortCode;
	const languageNames = new Intl.DisplayNames([locale], { type: 'language' });
	const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
	const formatDate = (iso: string | undefined) => (iso ? dateFormat.format(new Date(iso)) : '…');
	const facts = [
		[tPage('model'), data.model],
		[tPage('articleNumber'), data.articleNumber],
		[tPage('gtin'), data.gtin],
	].filter((fact): fact is [string, string] => Boolean(fact[1]));

	const fileList = (
		files: (THostedProductDocument & { validUntil?: string })[],
		validity: (file: THostedProductDocument & { validUntil?: string }) => string | null,
	) => (
		<ul className="divide-y rounded-lg border bg-background">
			{files.map((file) => (
				<li key={file.id ?? file.fileKey} className="flex items-center gap-3 px-3 py-2.5">
					<DocumentTextIcon className="size-5 shrink-0 text-muted-foreground" />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">
							{file.title || t(`documents.categories.${file.category}`)} ·{' '}
							{languageNames.of(file.language) ?? file.language}
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{[file.version, validity(file), formatBytes(file.fileSize)]
								.filter(Boolean)
								.join(' · ')}
						</p>
					</div>
					{pageUrl && file.id && (
						<a
							href={hostedFileUrl(pageUrl, file.id, true)}
							aria-label={tHosted('download')}
							title={tHosted('download')}
							className={buttonVariants({ size: 'sm', variant: 'outline' })}
						>
							<ArrowDownTrayIcon className="size-4 sm:mr-1.5" />
							<span className="hidden sm:inline">{tHosted('download')}</span>
						</a>
					)}
				</li>
			))}
		</ul>
	);

	const summary = (
		<div className="space-y-5">
			<div>
				{data.brandName && (
					<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						{data.brandName}
					</p>
				)}
				<h2 className="text-xl font-semibold break-words">{data.title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{facts.map(([label, value]) => `${label}: ${value}`).join(' · ')}
				</p>
				{data.description && (
					<p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
						{data.description}
					</p>
				)}
			</div>

			<div>
				<p className="mb-2 text-sm font-medium">
					{tPdf('documents.title')}{' '}
					<span className="font-normal text-muted-foreground">({data.documents.length})</span>
				</p>
				{fileList(data.documents, (file) =>
					file.validFrom ? tPage('since', { date: formatDate(file.validFrom) }) : null,
				)}
			</div>

			{data.archive && data.archive.length > 0 && (
				<div>
					<p className="mb-2 text-sm font-medium">
						{t('archive.title')}{' '}
						<span className="font-normal text-muted-foreground">({data.archive.length})</span>
					</p>
					{fileList(data.archive, (file) =>
						tPage('period', {
							from: formatDate(file.validFrom),
							until: formatDate(file.validUntil),
						}),
					)}
				</div>
			)}

			<div>
				<p className="mb-1 text-sm font-medium">{t('manufacturer.title')}</p>
				<p className="text-sm">{data.manufacturer.name}</p>
				<p className="text-sm whitespace-pre-line text-muted-foreground">
					{data.manufacturer.address}
				</p>
			</div>
		</div>
	);

	if (!shortCode) return summary;
	return (
		<HostedPageCard qrCode={qrCode} shortCode={shortCode}>
			{summary}
		</HostedPageCard>
	);
}
