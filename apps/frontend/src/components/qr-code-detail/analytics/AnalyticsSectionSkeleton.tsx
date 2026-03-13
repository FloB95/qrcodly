import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const AnalyticsSectionSkeleton = () => {
	return (
		<>
			{/* Summary cards skeleton */}
			<div className="xs:flex mb-4 gap-5 items-stretch">
				{Array.from({ length: 2 }).map((_, i) => (
					<Card key={i} className="mb-4 xs:mb-0 flex-1">
						<CardHeader>
							<div className="flex items-center gap-2">
								<Skeleton className="size-8 rounded-lg" />
								<Skeleton className="h-4 w-24" />
							</div>
							<Skeleton className="h-8 w-20 mt-2" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-4 w-48" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Time chart skeleton */}
			<Card className="mb-4">
				<CardHeader>
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-56" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[250px] sm:h-[300px] w-full rounded-lg" />
				</CardContent>
			</Card>

			{/* Metric charts skeleton */}
			<div className="lg:grid space-y-4 lg:space-y-0 gap-5 lg:grid-cols-2 pb-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<div className="flex items-center gap-2">
								<Skeleton className="size-8 rounded-lg" />
								<Skeleton className="h-5 w-32" />
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{Array.from({ length: 4 }).map((_, j) => (
								<div key={j} className="space-y-1">
									<div className="flex justify-between">
										<Skeleton className="h-4 w-20" />
										<Skeleton className="h-4 w-16" />
									</div>
									<Skeleton className="h-2 w-full rounded-full" />
								</div>
							))}
						</CardContent>
					</Card>
				))}
			</div>
		</>
	);
};
