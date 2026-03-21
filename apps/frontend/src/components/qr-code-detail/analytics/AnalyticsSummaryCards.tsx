'use client';

import type { ComponentType, SVGProps } from 'react';
import { Card } from '@/components/ui/card';
import {
	EyeIcon,
	UserGroupIcon,
	MapPinIcon,
	DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { AnimatedCounter } from './AnimatedCounter';
import type { AnalyticsVariant } from './AnalyticsSection';

interface AnalyticsSummaryCardsProps {
	totalScans: number;
	totalVisitors: number;
	scansLast7Days: number;
	visitorsLast7Days: number;
	topCountry: { label: string; share: number } | null;
	topDevice: { label: string; share: number } | null;
	variant?: AnalyticsVariant;
}

function AutoFitText({ text }: { text: string }) {
	const len = text.length;
	const sizeClass = len > 14 ? 'text-base' : len > 10 ? 'text-lg' : 'text-2xl';

	return (
		<span className={`${sizeClass} font-bold leading-tight line-clamp-2 break-words`}>{text}</span>
	);
}

function SummaryCard({
	label,
	icon: Icon,
	children,
	subText,
}: {
	label: string;
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	children: React.ReactNode;
	subText: React.ReactNode;
}) {
	return (
		<Card className="relative overflow-hidden p-5 flex flex-col">
			<Icon className="absolute right-3 top-3 size-10 lg:size-12 text-muted-foreground/25 stroke-1 pointer-events-none" />
			<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{label}
			</span>
			<div className="mt-2 tabular-nums">{children}</div>
			<p className="text-xs text-muted-foreground mt-auto pt-1">{subText}</p>
		</Card>
	);
}

export const AnalyticsSummaryCards = ({
	totalScans,
	totalVisitors,
	scansLast7Days,
	visitorsLast7Days,
	topCountry,
	topDevice,
	variant = 'scan',
}: AnalyticsSummaryCardsProps) => {
	const t = useTranslations();
	const totalLabel = variant === 'scan' ? t('analytics.totalViews') : t('analytics.totalClicks');

	const hasData = totalScans > 0 || totalVisitors > 0;

	return (
		<div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
			<SummaryCard
				label={totalLabel}
				icon={EyeIcon}
				subText={
					hasData ? (
						<>
							<span className="font-semibold text-foreground tabular-nums">
								<AnimatedCounter value={scansLast7Days} />
							</span>{' '}
							{t('analytics.lastSevenDays')}
						</>
					) : (
						t('analytics.noData')
					)
				}
			>
				<span className="text-2xl font-bold">
					<AnimatedCounter value={totalScans} />
				</span>
			</SummaryCard>

			<SummaryCard
				label={t('analytics.totalVisitors')}
				icon={UserGroupIcon}
				subText={
					hasData ? (
						<>
							<span className="font-semibold text-foreground tabular-nums">
								<AnimatedCounter value={visitorsLast7Days} />
							</span>{' '}
							{t('analytics.lastSevenDays')}
						</>
					) : (
						t('analytics.noData')
					)
				}
			>
				<span className="text-2xl font-bold">
					<AnimatedCounter value={totalVisitors} />
				</span>
			</SummaryCard>

			<SummaryCard
				label={t('analytics.topCountry')}
				icon={MapPinIcon}
				subText={
					topCountry ? (
						<>
							<span className="font-semibold text-foreground tabular-nums">{topCountry.share}</span>
							{t('analytics.ofTraffic', { pct: '' })}
						</>
					) : (
						t('analytics.noData')
					)
				}
			>
				{topCountry ? (
					<AutoFitText text={topCountry.label} />
				) : (
					<span className="text-2xl font-bold text-muted-foreground/40">···</span>
				)}
			</SummaryCard>

			<SummaryCard
				label={t('analytics.topDevice')}
				icon={DevicePhoneMobileIcon}
				subText={
					topDevice ? (
						<>
							<span className="font-semibold text-foreground tabular-nums">{topDevice.share}</span>
							{t('analytics.ofTraffic', { pct: '' })}
						</>
					) : (
						t('analytics.noData')
					)
				}
			>
				{topDevice ? (
					<AutoFitText text={topDevice.label} />
				) : (
					<span className="text-2xl font-bold text-muted-foreground/40">···</span>
				)}
			</SummaryCard>
		</div>
	);
};
