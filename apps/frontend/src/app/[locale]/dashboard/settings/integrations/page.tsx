'use client';

import { IntegrationsMarketplace } from '@/components/dashboard/integrations';
import { PuzzlePieceIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

export default function Page() {
	const t = useTranslations('settings.integrations');

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex items-center gap-3">
						<div className="p-3 bg-primary/10 rounded-lg">
							<PuzzlePieceIcon className="size-6 sm:size-8 stroke-1" />
						</div>
						<div>
							<CardTitle className="mb-0.5">{t('title')}</CardTitle>
							<CardDescription className="lg:max-w-[80%]">{t('description')}</CardDescription>
						</div>
					</div>
				</CardContent>
			</Card>

			<IntegrationsMarketplace />
		</>
	);
}
