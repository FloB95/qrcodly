'use client';

import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
	useAcknowledgeSafetyIncidentsMutation,
	useSafetyIncidentsQuery,
} from '@/lib/api/url-shortener';

/**
 * Tells the owner in-app that we disabled one of their links.
 *
 * Mounted in the dashboard layout so the message is seen wherever they land, not only on the
 * short-URL page. Dismissal is server-side (`acknowledgedAt`) rather than localStorage, so it
 * survives a new device and cannot hide a finding the user never actually saw.
 *
 * Styling note: the shared Alert `destructive` variant has no background and sets small body text
 * to --destructive, which fails contrast in dark mode. The container is styled locally instead of
 * changing alert.tsx, which has seven other call sites.
 */
export function SafetyIncidentBanner() {
	const t = useTranslations('shortUrl.safety.banner');
	const { data } = useSafetyIncidentsQuery();
	const acknowledge = useAcknowledgeSafetyIncidentsMutation();

	const incidents = data?.incidents ?? [];
	// Unacknowledged findings decide whether the banner shows at all…
	if (!incidents.length) return null;

	// …but the headline counts blocked *links*, because that is what the CTAs then list. Counting
	// incidents instead over-reports: a link stays blocked after its finding is dismissed, and one
	// link can collect several findings over time.
	const standaloneCount = data?.blockedStandaloneCount ?? 0;
	const qrCount = data?.blockedQrCodeCount ?? 0;
	const count = data?.blockedCount ?? incidents.length;

	// two keys instead of an ICU plural: these dictionaries use none today, and a missing `few`/`many`
	// category in pl/ru would throw at render time inside the layout and break every dashboard page
	const title = count === 1 ? t('titleOne') : t('titleMany', { count });
	const hosts = [...new Set(incidents.map((incident) => incident.destinationHost))].slice(0, 3);

	return (
		<div
			role="alert"
			className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex gap-3 min-w-0">
					<ExclamationTriangleIcon
						aria-hidden="true"
						className="size-5 shrink-0 text-red-600 dark:text-red-400"
					/>
					<div className="min-w-0 space-y-1">
						<p className="text-sm font-semibold text-red-900 dark:text-red-100">{title}</p>
						<p className="text-sm text-red-800 dark:text-red-200">{t('description')}</p>
						{/*
						 * Named separately because they live in different lists: the short URL list only
						 * ever shows standalone links, so a blocked dynamic-QR link is findable under QR
						 * codes. Lumping them together promised more rows than the list could show.
						 */}
						{standaloneCount > 0 && qrCount > 0 && (
							<p className="text-sm text-red-800 dark:text-red-200">
								{t('breakdown', { shortUrls: standaloneCount, qrCodes: qrCount })}
							</p>
						)}
						{hosts.length > 0 && (
							<p className="truncate font-mono text-xs text-red-700 dark:text-red-300">
								{hosts.join(', ')}
							</p>
						)}
						{data?.warningActive && (
							<p className="text-sm font-medium text-red-900 dark:text-red-100">
								{t('warningActive')}
							</p>
						)}
					</div>
				</div>

				{/* Stacked: up to three actions in one row crowds the banner and reads as a toolbar */}
				<div className="flex shrink-0 flex-col items-stretch gap-2 sm:w-44">
					{standaloneCount > 0 && (
						<Button asChild size="sm" variant="outlineStrong">
							<Link href="/dashboard/short-urls?status=blocked">{t('reviewShortUrlsCta')}</Link>
						</Button>
					)}
					{qrCount > 0 && (
						<Button asChild size="sm" variant="outlineStrong">
							<Link href="/dashboard/qr-codes?status=blocked">{t('reviewQrCodesCta')}</Link>
						</Button>
					)}
					<Button
						size="sm"
						variant="outline"
						onClick={() => acknowledge.mutate()}
						disabled={acknowledge.isPending}
					>
						{t('dismiss')}
					</Button>
				</div>
			</div>
		</div>
	);
}

export default SafetyIncidentBanner;
