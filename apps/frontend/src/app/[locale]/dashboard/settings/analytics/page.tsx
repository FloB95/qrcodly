import { ChartBarIcon } from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ScanIpExclusionsCard } from '@/components/dashboard/scan-ip-exclusions/ScanIpExclusionsCard';
import type { DefaultPageParams } from '@/types/page';

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'settings.analytics' });

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex items-center gap-3">
						<div className="p-3 bg-primary/10 rounded-lg">
							<ChartBarIcon className="size-6 sm:size-8 stroke-1" />
						</div>
						<div>
							<CardTitle className="mb-0.5">{t('title')}</CardTitle>
							<CardDescription className="lg:max-w-[80%]">{t('description')}</CardDescription>
						</div>
					</div>
				</CardContent>
			</Card>

			<ScanIpExclusionsCard />
		</>
	);
}
