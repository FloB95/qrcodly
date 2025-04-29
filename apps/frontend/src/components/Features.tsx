import {
	ChartBarIcon,
	QrCodeIcon,
	RectangleStackIcon,
	StarIcon,
	UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Badge } from './ui/badge';

export const Features = () => {
	const t = useTranslations('contentElements.featuresCta');
	const t2 = useTranslations('general');
	return (
		<div className="my-18 space-y-5 sm:my-32">
			<div className="mx-auto max-w-3xl text-center">
				<h2 className="mb-4 text-4xl font-bold">{t('headline')}</h2>
				<p className="text-accent-foreground text-xl sm:text-2xl">{t('subHeadline')}</p>
			</div>

			<div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
						<QrCodeIcon className="h-8 w-8" />
					</div>
					<h2 className="mb-3 text-xl font-bold text-gray-900">{t('editFeature.headline')}</h2>
					<p className="text-gray-600">{t('editFeature.subHeadline')}</p>
				</div>
				<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
						<ChartBarIcon className="h-8 w-8" />
					</div>
					<h2 className="mb-3 text-xl font-bold text-gray-900">{t('statisticFeature.headline')}</h2>
					<p className="text-gray-600">{t('statisticFeature.subHeadline')}</p>
				</div>
				<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
						<RectangleStackIcon className="h-8 w-8" />
					</div>
					<h2 className="mb-3 text-xl font-bold text-gray-900">{t('overviewFeature.headline')}</h2>
					<p className="text-gray-600">{t('overviewFeature.subHeadline')}</p>
				</div>
				<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
						<StarIcon className="h-8 w-8" />
					</div>
					<h2 className="mb-3 text-xl font-bold text-gray-900">{t('templateFeature.headline')}</h2>
					<p className="text-gray-600">{t('templateFeature.subHeadline')}</p>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="md:col-span-2 lg:col-start-2">
					<div className="flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-md relative">
						<Badge className="absolute right-4 top-4">{t2('comingSoon')}</Badge>
						<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-black text-white">
							<UserGroupIcon className="h-8 w-8" />
						</div>
						<h2 className="mb-3 text-xl font-bold text-gray-900">{t('teamFeature.headline')}</h2>
						<p className="text-gray-600">{t('teamFeature.subHeadline')}</p>
					</div>
				</div>
			</div>
		</div>
	);
};
