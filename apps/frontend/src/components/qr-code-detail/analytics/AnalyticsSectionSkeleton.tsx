import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const AnalyticsSectionSkeleton = () => {
	return (
		<>
			{/* Summary cards skeleton - 4 cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i} className="p-5">
						<div className="flex items-center justify-between mb-3">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="size-7 rounded-md" />
						</div>
						<Skeleton className="h-7 w-24 mb-1" />
						<Skeleton className="h-3 w-32 mt-1" />
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

			{/* Two-column layout: Country + Device/Browser */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 py-4">
				{/* Country chart skeleton */}
				<Card className="h-full">
					<CardHeader>
						<Skeleton className="h-5 w-40" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-[200px] w-full rounded-lg mb-4" />
						<div className="space-y-4">
							{Array.from({ length: 6 }).map((_, j) => (
								<div key={j} className="space-y-1.5">
									<div className="flex justify-between">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-10" />
									</div>
									<Skeleton className="h-1.5 w-full rounded-full" />
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Device + Browser skeleton */}
				<div className="space-y-5">
					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-32" />
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-6">
								<Skeleton className="size-[140px] rounded-full shrink-0" />
								<div className="space-y-3 flex-1">
									{Array.from({ length: 3 }).map((_, j) => (
										<div key={j} className="flex items-center gap-2.5">
											<Skeleton className="size-2.5 rounded-full" />
											<div>
												<Skeleton className="h-4 w-16 mb-1" />
												<Skeleton className="h-3 w-24" />
											</div>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Skeleton className="h-5 w-32" />
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-3">
								{Array.from({ length: 4 }).map((_, j) => (
									<div key={j} className="rounded-lg bg-muted/50 p-4">
										<Skeleton className="h-3 w-16 mb-2" />
										<Skeleton className="h-7 w-12" />
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* OS chart skeleton */}
			<Card className="mb-4">
				<CardHeader>
					<div className="flex items-center gap-2">
						<Skeleton className="size-7 rounded-md" />
						<Skeleton className="h-5 w-40" />
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 4 }).map((_, j) => (
						<div key={j} className="space-y-1.5">
							<div className="flex justify-between">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-16" />
							</div>
							<Skeleton className="h-1.5 w-full rounded-full" />
						</div>
					))}
				</CardContent>
			</Card>
		</>
	);
};
