import { CreditCardIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	BillingProvider,
	CurrentPlanSection,
	PaymentMethodsSection,
	PaymentHistorySection,
} from '@/components/dashboard/billing';
import type { DefaultPageParams } from '@/types/page';
import { getTranslations } from 'next-intl/server';

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'settings.billing' });

	return (
		<BillingProvider>
			<div className="space-y-6">
				{/* Header Card */}
				<Card className="@container/card">
					<CardContent className="relative px-4 sm:px-6">
						<div className="flex items-start gap-3">
							<div className="p-3 bg-primary/10 rounded-lg">
								<CreditCardIcon className="size-6 sm:size-8 stroke-1" />
							</div>
							<div>
								<CardTitle className="mb-0.5">{t('title')}</CardTitle>
								<CardDescription>{t('description')}</CardDescription>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Billing Tabs */}
				<Tabs defaultValue="plan" className="w-full">
					<TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 h-full">
						<TabsTrigger value="plan">{t('tabPlan')}</TabsTrigger>
						<TabsTrigger value="payment">{t('tabPaymentMethods')}</TabsTrigger>
						<TabsTrigger value="history">{t('tabHistory')}</TabsTrigger>
					</TabsList>

					<TabsContent value="plan">
						<CurrentPlanSection />
					</TabsContent>

					<TabsContent value="payment">
						<PaymentMethodsSection />
					</TabsContent>

					<TabsContent value="history">
						<PaymentHistorySection />
					</TabsContent>
				</Tabs>
			</div>
		</BillingProvider>
	);
}
