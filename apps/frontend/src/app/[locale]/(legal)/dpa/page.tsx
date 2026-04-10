import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';
import AvvContentDe from './content-de';
import AvvContentEn from './content-en';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	return locale === 'de'
		? {
				title: 'Auftragsverarbeitungsvereinbarung (AVV) | QRcodly',
				description: 'Auftragsverarbeitungsvereinbarung (AVV) gemäß Art. 28 DSGVO für QRcodly.',
			}
		: {
				title: 'Data Processing Agreement (DPA) | QRcodly',
				description: 'Data Processing Agreement pursuant to Art. 28 GDPR for QRcodly.',
			};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	return locale === 'de' ? <AvvContentDe /> : <AvvContentEn />;
}
