import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';
import PrivacyPolicyContentDe from './content-de';
import PrivacyPolicyContentEn from './content-en';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	return locale === 'de'
		? {
				title: 'Datenschutzerklärung | QRcodly',
				description:
					'Datenschutzerklärung für QRcodly. Erfahren Sie, wie wir Ihre Daten verarbeiten und schützen.',
			}
		: {
				title: 'Privacy Policy | QRcodly',
				description:
					'Privacy Policy for QRcodly. Learn how we collect, process, and protect your data.',
			};
}

export default async function Page({ params }: DefaultPageParams) {
	const { locale } = await params;
	return locale === 'de' ? <PrivacyPolicyContentDe /> : <PrivacyPolicyContentEn />;
}
