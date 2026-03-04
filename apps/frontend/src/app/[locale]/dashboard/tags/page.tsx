'use client';

import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { TagIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { TagList } from '@/components/dashboard/tags/TagList';
import { TagCreateDialog } from '@/components/dashboard/tags/TagCreateDialog';

export default function TagsPage() {
	const t = useTranslations('tags');

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<TagIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription>{t('description')}</CardDescription>
							</div>
						</div>
						<div className="flex items-center gap-2 self-end sm:self-auto">
							<TagCreateDialog />
						</div>
					</div>
				</CardContent>
			</Card>

			<TagList />
		</>
	);
}
