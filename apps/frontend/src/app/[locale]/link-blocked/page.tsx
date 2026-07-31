import { buttonVariants } from '@/components/ui/button';
import type { DefaultPageParams } from '@/types/page';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

/**
 * Where a visitor lands after scanning a link we blocked for pointing at an unsafe destination.
 *
 * Deliberately inert: no destination host, no short code, no "continue anyway" link and no analytics.
 * The person arriving here may be the target of the attack, so the page must not help them reach it
 * and must not leak the referrer onward.
 */
export default async function LinkBlockedPage({ params }: DefaultPageParams) {
	const { locale } = await params;
	const t = await getTranslations({ locale });

	return (
		<div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
			<div className="mb-7 flex size-16 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-50">
				<ShieldExclamationIcon aria-hidden="true" className="size-8 stroke-[1.5] text-red-600" />
			</div>

			<h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
				{t('linkBlocked.title')}
			</h1>

			<p className="mt-4 text-base text-pretty text-gray-700 sm:text-lg">
				{t('linkBlocked.description')}
			</p>

			<p className="mt-3 text-sm text-pretty text-gray-500">{t('linkBlocked.note')}</p>

			<Link href="/" className={`${buttonVariants({ size: 'lg' })} mt-9`}>
				{t('linkBlocked.button')}
			</Link>
		</div>
	);
}
