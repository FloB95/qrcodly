import { AddCustomDomainDialog, CustomDomainList } from '@/components/dashboard/custom-domain';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';

export default function Page() {
	const t = useTranslations('settings.domains');
	return (
		<>
			<div className="px-4 lg:px-6">
				<Card className="@container/card">
					<CardContent className="relative">
						<div className="flex items-center justify-between gap-3">
							<div className="flex items-center justify-between gap-3">
								<div className="p-3 bg-primary/10 rounded-lg">
									<GlobeAltIcon className="size-8 stroke-1" />
								</div>
								<div>
									<CardTitle className="mb-0.5">{t('title')}</CardTitle>
									<CardDescription>
										<div>{t('description')}</div>
									</CardDescription>
								</div>
							</div>
							<div className="">
								<AddCustomDomainDialog />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
			<div className="px-4 lg:px-6">
				<CustomDomainList />
			</div>
		</>
	);
}
