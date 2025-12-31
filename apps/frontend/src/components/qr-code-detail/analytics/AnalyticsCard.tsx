'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import React from 'react';

interface AnalyticsCardProps {
	data: Array<Record<string, string | number>>;
	title: string;
}

export const AnalyticsCard = ({ data, title }: AnalyticsCardProps) => {
	const t = useTranslations('analytics');
	return (
		<Card className="gap-0 h-full">
			<CardHeader>
				<CardTitle className="text-lg">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<p className="text-muted-foreground text-sm">{t('noData')}</p>
				) : (
					<>
						{data.slice(0, 13).map((d) => (
							<div key={d.label} className="flex justify-between items-center">
								<div className="pr-4">{d.label}</div>

								<div className="grid grid-cols-[4rem_1.5rem_2rem] text-muted-foreground text-right">
									<div className="text-black tabular-nums">{d.data}</div>
									<div className="text-center">|</div>
									<div className="tabular-nums">{d.percentage}</div>
								</div>
							</div>
						))}
					</>
				)}
			</CardContent>
		</Card>
	);
};
