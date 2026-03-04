import { BillingHeader, CurrentPlanSection } from '@/components/dashboard/billing';

export default function Page() {
	return (
		<div className="space-y-6">
			<BillingHeader />
			<CurrentPlanSection />
		</div>
	);
}
