import { getTranslations } from 'next-intl/server';
import type { DefaultPageParams } from '@/types/page';
import Container from '@/components/ui/container';
import { ListSection } from '@/components/dashboard/ListSection';

export default async function Collection({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale });

	return (
		<div className="mt-24 flex h-full w-full flex-1 flex-col items-center justify-center">
			<Container>
				<h1 className="mt-8 mb-4 text-center text-4xl font-bold max-w-[600px] mx-auto">
					{t('collection.headline')}
				</h1>
				<h2 className="mt-8 mb-24 text-center text-accent-foreground text-xl max-w-[850px] mx-auto sm:text-2xl">
					{t('collection.subHeadline')}
				</h2>
				<ListSection />
			</Container>
		</div>
	);
}
