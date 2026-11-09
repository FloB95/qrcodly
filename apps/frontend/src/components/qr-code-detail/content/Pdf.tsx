'use client';

import { useTranslations } from 'next-intl';
import {
	ArrowDownTrayIcon,
	ArrowTopRightOnSquareIcon,
	DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { hostedFileUrl, type TQrCodeWithRelationsResponseDto } from '@shared/schemas';
import { buttonVariants } from '@/components/ui/button';
import { useShortUrlLink } from '@/hooks/use-short-url-link';
import { formatBytes } from '@/components/hosted-page/format';
import { HostedPageCard } from './HostedPageCard';

export default function PdfContent({ qrCode }: { qrCode: TQrCodeWithRelationsResponseDto }) {
	const t = useTranslations('generator.contentSwitch.pdf');
	const tHosted = useTranslations('hostedPage.pdf');
	const { link: pageUrl } = useShortUrlLink(qrCode.shortUrl);
	if (qrCode.content.type !== 'pdf') return null;

	const data = qrCode.content.data;
	const shortCode = qrCode.shortUrl?.shortCode;

	const summary = (
		<div className="space-y-5">
			<div>
				{data.brandName && (
					<p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						{data.brandName}
					</p>
				)}
				<h2 className="text-xl font-semibold break-words">{data.title}</h2>
				{data.description && (
					<p className="mt-1 line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
						{data.description}
					</p>
				)}
			</div>

			<div>
				<p className="mb-2 text-sm font-medium">
					{t('documents.title')}{' '}
					<span className="font-normal text-muted-foreground">({data.documents.length})</span>
				</p>
				<ul className="divide-y rounded-lg border bg-background">
					{data.documents.map((document) => (
						<li
							key={document.id ?? document.fileKey}
							className="flex items-center gap-3 px-3 py-2.5"
						>
							<DocumentTextIcon className="size-5 shrink-0 text-muted-foreground" />
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">
									{document.title || document.fileName}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{document.fileName} · {formatBytes(document.fileSize)}
								</p>
							</div>
							{pageUrl && document.id && (
								<a
									href={hostedFileUrl(pageUrl, document.id, true)}
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
			</div>

			{data.link && (
				<div>
					<p className="mb-1 text-sm font-medium">{t('link.title')}</p>
					<a
						href={data.link.url}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex max-w-full items-center gap-2 text-sm hover:underline"
					>
						<span className="shrink-0 font-medium">{data.link.label}</span>
						<span className="truncate text-muted-foreground">{data.link.url}</span>
						<ArrowTopRightOnSquareIcon className="size-4 shrink-0 text-muted-foreground" />
					</a>
				</div>
			)}
		</div>
	);

	if (!shortCode) return summary;
	return (
		<HostedPageCard qrCode={qrCode} shortCode={shortCode}>
			{summary}
		</HostedPageCard>
	);
}
