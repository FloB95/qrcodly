import { AddCustomDomainDialog, CustomDomainList } from '@/components/dashboard/custom-domain';
import { ExclamationCircleIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';

export default function Page() {
	const t = useTranslations('settings.domains');

	const daysLeftUntilDeactivation = 5;
	return (
		<>
			<Alert variant="destructive">
				<ExclamationCircleIcon className="size-5" />
				<AlertTitle>Your Pro Plan has expired</AlertTitle>
				<AlertDescription>
					<p className="mb-2">
						Your custom domains and dynamic QR codes will stop working in{' '}
						{daysLeftUntilDeactivation} days. To keep your links active, please renew your Pro Plan.
					</p>
					<a
						href="billing"
						className={buttonVariants({ variant: 'secondary', size: 'sm' })}
						title="Go to billing"
					>
						Renew Now
					</a>
				</AlertDescription>
			</Alert>
			<Card className="@container/card">
				<CardContent className="relative px-4 sm:px-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<div className="flex items-start sm:items-center justify-between gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<GlobeAltIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription>
									<div>{t('description')}</div>
								</CardDescription>
							</div>
						</div>
						<div>
							<AddCustomDomainDialog />
						</div>
					</div>
				</CardContent>
			</Card>

			<CustomDomainList />
		</>
	);
}
