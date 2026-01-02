import {
	ChartBarIcon,
	QrCodeIcon,
	RectangleStackIcon,
	ShieldCheckIcon,
	StarIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Badge } from './ui/badge';
import { AnimatedIcon } from './AnimatedIcon';
import type { ReactNode } from 'react';

interface FeatureCardProps {
	icon: ReactNode;
	headlineKey: string;
	subHeadlineKey: string;
	badge?: string;
}

const FeatureCard = ({ icon, headlineKey, subHeadlineKey, badge }: FeatureCardProps) => {
	const t = useTranslations('contentElements.featuresCta');

	return (
		<div className="flex flex-col items-center rounded-2xl from-white to-white/60 bg-linear-to-br p-6 md:p-8 text-center relative">
			{badge && <Badge className="absolute right-4 top-4">{badge}</Badge>}
			{icon}
			<h3 className="mb-3 text-xl font-medium text-slate-900">{t(headlineKey)}</h3>
			<p className="text-slate-700">{t(subHeadlineKey)}</p>
		</div>
	);
};

export const Features = () => {
	const t = useTranslations('contentElements.featuresCta');
	const t2 = useTranslations('general');

	return (
		<div className="my-20 space-y-5 sm:my-32 tracking-tight">
			<div className="mx-auto max-w-3xl text-center">
				<h2 className="mb-4 text-3xl sm:text-4xl font-bold text-slate-900">{t('headline')}</h2>
				<h3 className="mb-4 text-lg sm:text-2xl to-muted-foreground">{t('subHeadline')}</h3>
			</div>

			{/* Security Feature */}
			<div className="mt-12 sm:mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="md:col-span-2 lg:col-start-2">
					<FeatureCard
						icon={
							<AnimatedIcon>
								<ShieldCheckIcon className="h-8 w-8" />
							</AnimatedIcon>
						}
						headlineKey="secureFeature.headline"
						subHeadlineKey="secureFeature.subHeadline"
					/>
				</div>
			</div>

			{/* Main Features Grid */}
			<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<FeatureCard
					icon={
						<AnimatedIcon delay={0.1}>
							<QrCodeIcon className="h-8 w-8" />
						</AnimatedIcon>
					}
					headlineKey="editFeature.headline"
					subHeadlineKey="editFeature.subHeadline"
				/>
				<FeatureCard
					icon={
						<AnimatedIcon delay={0.2}>
							<ChartBarIcon className="h-8 w-8" />
						</AnimatedIcon>
					}
					headlineKey="statisticFeature.headline"
					subHeadlineKey="statisticFeature.subHeadline"
				/>
				<FeatureCard
					icon={
						<AnimatedIcon delay={0.3}>
							<RectangleStackIcon className="h-8 w-8" />
						</AnimatedIcon>
					}
					headlineKey="overviewFeature.headline"
					subHeadlineKey="overviewFeature.subHeadline"
				/>
				<FeatureCard
					icon={
						<AnimatedIcon delay={0.4}>
							<StarIcon className="h-8 w-8" />
						</AnimatedIcon>
					}
					headlineKey="templateFeature.headline"
					subHeadlineKey="templateFeature.subHeadline"
				/>
			</div>

			{/* Team Feature (Coming Soon) */}
			<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="md:col-span-2 lg:col-start-2">
					<FeatureCard
						icon={
							<AnimatedIcon>
								<UserGroupIcon className="h-8 w-8" />
							</AnimatedIcon>
						}
						headlineKey="teamFeature.headline"
						subHeadlineKey="teamFeature.subHeadline"
						badge={t2('comingSoon')}
					/>
				</div>
			</div>
		</div>
	);
};
