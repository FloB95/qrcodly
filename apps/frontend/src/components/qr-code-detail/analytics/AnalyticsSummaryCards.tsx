'use client';

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { AnimatedCounter } from './AnimatedCounter';

interface AnalyticsSummaryCardsProps {
	totalScans: number;
	totalVisitors: number;
	scansLast7Days: number;
	visitorsLast7Days: number;
}

export const AnalyticsSummaryCards = ({
	totalScans,
	totalVisitors,
	scansLast7Days,
	visitorsLast7Days,
}: AnalyticsSummaryCardsProps) => {
	const t = useTranslations();

	return (
		<div className="xs:flex mb-4 gap-5 items-center">
			<Card className="h-full mb-4 xs:mb-0">
				<CardHeader className="relative">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-lg bg-primary/10 text-primary">
							<EyeIcon className="size-4" />
						</div>
						<CardDescription>{t('analytics.totalViews')}</CardDescription>
					</div>
					<CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
						<AnimatedCounter value={totalScans} />
					</CardTitle>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium text-muted-foreground items-center">
						<span>
							<span className="font-semibold text-black dark:text-white">
								<AnimatedCounter value={scansLast7Days} />
							</span>{' '}
							{t('analytics.viewsInLastXDays', {
								count: '',
								days: '',
							}).replace(/\s+/g, ' ')}{' '}
							<span className="font-semibold text-black dark:text-white">
								7 {t('general.days')}
							</span>
						</span>
					</div>
				</CardFooter>
			</Card>
			<Card className="h-full">
				<CardHeader className="relative">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-lg bg-primary/10 text-primary">
							<UserGroupIcon className="size-4" />
						</div>
						<CardDescription>{t('analytics.totalVisitors')}</CardDescription>
					</div>
					<CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
						<AnimatedCounter value={totalVisitors} />
					</CardTitle>
				</CardHeader>
				<CardFooter className="flex-col items-start gap-1 text-sm">
					<div className="line-clamp-1 flex gap-2 font-medium text-muted-foreground items-center">
						<span>
							<span className="font-semibold text-black dark:text-white">
								<AnimatedCounter value={visitorsLast7Days} />
							</span>{' '}
							{t('analytics.visitorsInLastXDays', {
								count: '',
								days: '',
							}).replace(/\s+/g, ' ')}{' '}
							<span className="font-semibold text-black dark:text-white">
								7 {t('general.days')}
							</span>
						</span>
					</div>
				</CardFooter>
			</Card>
		</div>
	);
};
