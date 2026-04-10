import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';
import ImprintContentDe from './content-de';
import ImprintContentEn from './content-en';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	return locale === 'de'
		? {
				title: 'Impressum | QRcodly',
				description: 'Impressum und rechtliche Hinweise für QRcodly.',
			}
		: {
				title: 'Imprint – Legal Notice | QRcodly',
				description: 'Legal notice and imprint for QRcodly.',
			};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	return locale === 'de' ? <ImprintContentDe /> : <ImprintContentEn />;
}
