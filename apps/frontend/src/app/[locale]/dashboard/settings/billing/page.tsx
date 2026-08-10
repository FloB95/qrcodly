import {
	BillingHeader,
	CurrentPlanSection,
	DomainAddonSection,
} from '@/components/dashboard/billing';

export default function Page() {
	return (
		<div className="space-y-6">
			<BillingHeader />
			<CurrentPlanSection />
			<DomainAddonSection />
		</div>
	);
}
