import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BillingSkeletonProps {
	titleWidth?: string;
	descriptionWidth?: string;
	contentHeight?: string;
}

export function BillingSkeleton({
	titleWidth = 'w-40',
	descriptionWidth = 'w-64',
	contentHeight = 'h-32',
}: BillingSkeletonProps) {
	return (
		<Card>
			<CardHeader>
				<Skeleton className={`h-6 ${titleWidth}`} />
				<Skeleton className={`h-4 ${descriptionWidth} mt-2`} />
			</CardHeader>
			<CardContent>
				<Skeleton className={`${contentHeight} w-full`} />
			</CardContent>
		</Card>
	);
}
