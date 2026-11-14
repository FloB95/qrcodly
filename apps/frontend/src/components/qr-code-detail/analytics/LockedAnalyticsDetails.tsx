'use client';

import { useMemo } from 'react';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { getName } from 'i18n-iso-countries';
import { useTranslations } from 'next-intl';
import posthog from 'posthog-js';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnalyticsDetails, type AnalyticsDetailsData } from './AnalyticsDetails';
import type { AnalyticsVariant } from './AnalyticsSection';

// Invented figures for the blurred preview: the API never sends a free plan the real breakdowns.
const DEMO_DAILY_SCANS = [
	12, 18, 15, 22, 30, 26, 19, 24, 35, 41, 33, 28, 37, 45, 52, 48, 39, 44, 58, 63, 55, 49, 61, 70,
	66, 59, 72, 81, 76, 88,
];
const DEMO_COUNTRIES: [string, number][] = [
	['DE', 412],
	['AT', 138],
	['CH', 96],
	['NL', 54],
	['FR', 41],
	['US', 27],
];
const DEMO_DEVICES = [
	{ label: 'Mobile', count: 584 },
	{ label: 'Desktop', count: 151 },
	{ label: 'Tablet', count: 33 },
];
const DEMO_BROWSERS = [
	{ label: 'Chrome', count: 311 },
	{ label: 'Safari', count: 268 },
	{ label: 'Samsung Internet', count: 97 },
	{ label: 'Firefox', count: 52 },
	{ label: 'Edge', count: 40 },
];
const DEMO_OS = [
	{ label: 'iOS', count: 301 },
	{ label: 'Android OS', count: 283 },
	{ label: 'Windows 10', count: 112 },
	{ label: 'Mac OS', count: 72 },
];

function buildDemoData(locale: string): AnalyticsDetailsData {
	const today = new Date();

	return {
		dailyData: DEMO_DAILY_SCANS.map((scans, index) => {
			const date = new Date(today);
			date.setDate(today.getDate() - (DEMO_DAILY_SCANS.length - 1 - index));
			return {
				date: date.toISOString().slice(0, 10),
				scans,
				visitors: Math.round(scans * 0.7),
			};
		}),
		countryMetrics: DEMO_COUNTRIES.map(([code, count]) => ({
			code,
			count,
			label: getName(code.toLowerCase(), locale) ?? code,
		})),
		deviceMetrics: DEMO_DEVICES,
		browserMetrics: DEMO_BROWSERS,
		osMetrics: DEMO_OS,
	};
}

export const LockedAnalyticsDetails = ({
	locale,
	variant,
}: {
	locale: string;
	variant: AnalyticsVariant;
}) => {
	const t = useTranslations('analytics.locked');
	const demoData = useMemo(() => buildDemoData(locale), [locale]);

	return (
		<div className="relative">
			<div aria-hidden inert className="pointer-events-none select-none blur-sm">
				<AnalyticsDetails data={demoData} locale={locale} variant={variant} />
			</div>

			<div className="absolute inset-0 flex justify-center px-2 sm:px-4">
				<Card className="sticky top-28 mt-12 h-fit w-full max-w-md gap-0 p-6 text-center shadow-lg sm:mt-20">
					<span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-teal-600/10 text-teal-700">
						<LockClosedIcon className="size-5" />
					</span>
					<h3 className="text-lg font-semibold">{t('title')}</h3>
					<p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
					<Button asChild className="mt-5 self-center">
						<Link
							href="/plans"
							onClick={() =>
								posthog.capture('pro_gate_clicked', { source: 'analytics_details', variant })
							}
						>
							<SparklesIcon className="size-4 mr-2" />
							{t('cta')}
						</Link>
					</Button>
				</Card>
			</div>
		</div>
	);
};
