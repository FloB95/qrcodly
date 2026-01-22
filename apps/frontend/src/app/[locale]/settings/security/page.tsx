import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { PasswordSection, SessionsSection } from '@/components/dashboard/security';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'settings.security' });

	return (
		<div className="space-y-6">
			{/* Header Card */}
			<Card className="@container/card">
				<CardContent className="relative">
					<div className="flex items-start gap-3 flex-wrap">
						<div className="p-3 bg-primary/10 rounded-lg">
							<ShieldCheckIcon className="size-6 sm:size-8 stroke-1" />
						</div>
						<div>
							<CardTitle className="mb-0.5">{t('title')}</CardTitle>
							<CardDescription>{t('description')}</CardDescription>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Password Section */}
			<PasswordSection />

			{/* Sessions Section */}
			<SessionsSection />

			{/* TODO: Implement delete account handling before re-enabling this section */}
			{/* <DeleteAccountSection /> */}
		</div>
	);
}
