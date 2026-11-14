import { buttonVariants } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

/** Shown after a scan of a switched-off code, by the /disabled page and by hosted pages. */
export async function QrCodeDisabledContent({ locale }: { locale: string }) {
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
