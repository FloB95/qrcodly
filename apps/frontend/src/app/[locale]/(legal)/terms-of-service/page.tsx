import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';
import AgbContentDe from './content-de';
import AgbContentEn from './content-en';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	return locale === 'de'
		? {
				title: 'Allgemeine Geschäftsbedingungen (AGB) | QRcodly',
				description: 'Allgemeine Geschäftsbedingungen für die Nutzung der QRcodly-Plattform.',
			}
		: {
				title: 'Terms of Service | QRcodly',
				description: 'Terms of Service for using the QRcodly platform.',
			};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	return locale === 'de' ? <AgbContentDe /> : <AgbContentEn />;
}
