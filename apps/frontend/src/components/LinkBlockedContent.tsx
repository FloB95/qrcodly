import { buttonVariants } from '@/components/ui/button';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

/** Shown after a scan of a code we blocked, by the /link-blocked page and by hosted pages. */
export async function LinkBlockedContent({ locale }: { locale: string }) {
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
