import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

// reached only by rewrite from a scan; there is nothing here worth indexing
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default async function QrCodeDisabledPage({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale });
	return (
		<div className="mt-24 flex h-full w-full flex-1 flex-col items-center justify-center">
			<Container>
				<h1 className="mt-8 mb-6 text-center text-2xl sm:text-4xl font-semibold">
					{t('qrCodeDisabled.title')}
				</h1>
				<p className="mb-2 text-center text-lg text-gray-700">{t('qrCodeDisabled.description')}</p>
				<p className="mb-10 text-center text-md text-gray-500">{t('qrCodeDisabled.note')}</p>
				<div className="flex justify-center">
					<Link href="/" className={buttonVariants()}>
						{t('qrCodeDisabled.button')}
					</Link>
				</div>
			</Container>
		</div>
	);
}
