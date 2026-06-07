import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

const SUPPORT_EMAIL = 'support@qrcodly.de';

// Keep the ban page out of search engines.
export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

export default async function AccountBannedPage({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale });
	return (
		<div className="mt-24 flex h-full w-full flex-1 flex-col items-center justify-center">
			<Container>
				<h1 className="mt-8 mb-6 text-center text-2xl sm:text-4xl font-semibold">
					{t('accountBanned.title')}
				</h1>
				<p className="mb-2 text-center text-lg text-gray-700">{t('accountBanned.description')}</p>
				<p className="mb-2 text-center text-md text-gray-500">{t('accountBanned.note')}</p>
				<p className="mb-10 text-center text-md text-gray-500">
					<a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
						{SUPPORT_EMAIL}
					</a>
				</p>
				<div className="flex justify-center">
					<Link href="/" className={buttonVariants()}>
						{t('accountBanned.button')}
					</Link>
				</div>
			</Container>
		</div>
	);
}
