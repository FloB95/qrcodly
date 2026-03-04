import { BillingHeader, CurrentPlanSection } from '@/components/dashboard/billing';

export default function SettingsBillingPage() {
	return (
		<div className="space-y-6">
			<BillingHeader />
			<CurrentPlanSection />
		</div>
	);
}
