'use client';

import { ShortUrlList } from '@/components/dashboard/shortUrl/ShortUrlList';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { LinkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { CreateShortUrlDialog } from '@/components/dashboard/shortUrl/CreateShortUrlDialog';

export default function ShortUrlsPage() {
	const t = useTranslations('shortUrl');

	return (
		<>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<LinkIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription>{t('description')}</CardDescription>
							</div>
						</div>
						<div className="self-end sm:self-auto">
							<CreateShortUrlDialog />
						</div>
					</div>
				</CardContent>
			</Card>

			<ShortUrlList />
		</>
	);
}
