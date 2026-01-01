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

export const Features = () => {
	const t = useTranslations('contentElements.featuresCta');
	const t2 = useTranslations('general');
	return (
		<div className="my-20 space-y-5 sm:my-32 tracking-tight">
			<div className="mx-auto max-w-3xl text-center">
				<h2 className="mb-4 text-3xl sm:text-4xl font-bold text-slate-900">{t('headline')}</h2>
				<h3 className="mb-4 text-lg sm:text-2xl to-muted-foreground">{t('subHeadline')}</h3>
			</div>

			<div className="mt-12 sm:mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="md:col-span-2 lg:col-start-2 ">
					<div className="flex flex-col items-center rounded-2xl from-white to-white/60 bg-gradient-to-br p-6 md:p-8 text-center relative">
						<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-white">
							<ShieldCheckIcon className="h-8 w-8" />
						</div>
						<h3 className="mb-3 text-xl font-medium text-slate-900">
							{t('secureFeature.headline')}
						</h3>
						<p className="text-slate-700">{t('secureFeature.subHeadline')}</p>
					</div>
				</div>
			</div>
			<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="flex flex-col items-center rounded-2xl from-white to-white/60 bg-gradient-to-br p-6 md:p-8 text-center">
					<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-white">
						<QrCodeIcon className="h-8 w-8" />
					</div>
					<h3 className="mb-3 text-xl font-medium text-slate-900">{t('editFeature.headline')}</h3>
					<p className="text-slate-700">{t('editFeature.subHeadline')}</p>
				</div>
				<div className="flex flex-col items-center rounded-2xl from-white to-white/60 bg-gradient-to-br p-6 md:p-8 text-center">
					<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-white">
						<ChartBarIcon className="h-8 w-8" />
					</div>
					<h3 className="mb-3 text-xl font-medium text-slate-900">
						{t('statisticFeature.headline')}
					</h3>
					<p className="text-slate-700">{t('statisticFeature.subHeadline')}</p>
				</div>
				<div className="flex flex-col items-center rounded-2xl from-white to-white/60 bg-gradient-to-br p-6 md:p-8 text-center">
					<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-white">
						<RectangleStackIcon className="h-8 w-8" />
					</div>
					<h3 className="mb-3 text-xl font-medium text-slate-900">
						{t('overviewFeature.headline')}
					</h3>
					<p className="text-slate-700">{t('overviewFeature.subHeadline')}</p>
				</div>
				<div className="flex flex-col items-center rounded-2xl from-white to-white/60 bg-gradient-to-br p-6 md:p-8 text-center">
					<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-white">
						<StarIcon className="h-8 w-8" />
					</div>
					<h3 className="mb-3 text-xl font-medium text-slate-900">
						{t('templateFeature.headline')}
					</h3>
					<p className="text-slate-700">{t('templateFeature.subHeadline')}</p>
				</div>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="md:col-span-2 lg:col-start-2">
					<div className="flex flex-col items-center rounded-2xl from-white to-white/60 bg-gradient-to-br p-6 md:p-8 text-center relative">
						<Badge className="absolute right-4 top-4">{t2('comingSoon')}</Badge>
						<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-white">
							<UserGroupIcon className="h-8 w-8" />
						</div>
						<h3 className="mb-3 text-xl font-medium text-slate-900">{t('teamFeature.headline')}</h3>
						<p className="text-slate-700">{t('teamFeature.subHeadline')}</p>
					</div>
				</div>
			</div>
		</div>
	);
};
