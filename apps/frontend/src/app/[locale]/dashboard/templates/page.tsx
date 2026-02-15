'use client';

import { TemplateList } from '@/components/dashboard/templates/TemplateList';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { StarIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

export default function TemplatesPage() {
	const t = useTranslations();

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<StarIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('collection.tabTemplates')}</CardTitle>
								<CardDescription>{t('templates.pageDescription')}</CardDescription>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<TemplateList />
		</>
	);
}
