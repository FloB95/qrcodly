import { UserIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { ProfileSection, ConnectedAccountsSection } from '@/components/dashboard/profile';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'settings.profile' });

	return (
		<div className="space-y-6">
			{/* Header Card */}
			<Card className="@container/card">
				<CardContent className="relative">
					<div className="flex items-start gap-3">
						<div className="p-3 bg-primary/10 rounded-lg">
							<UserIcon className="size-6 sm:size-8 stroke-1" />
						</div>
						<div>
							<CardTitle className="mb-0.5">{t('pageTitle')}</CardTitle>
							<CardDescription>{t('pageDescription')}</CardDescription>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Profile Section */}
			<ProfileSection />

			{/* Connected Accounts Section */}
			<ConnectedAccountsSection />
		</div>
	);
}
