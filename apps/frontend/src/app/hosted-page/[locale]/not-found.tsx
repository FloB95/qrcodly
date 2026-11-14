import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';
import { HostedPageStateScreen } from '@/components/hosted-page/HostedPageStateScreen';

/** A page that does not exist (any more), shown without the site's trackers and login. */
export default async function HostedPageNotFound() {
	const t = await getTranslations('notFound');
	return (
		<HostedPageStateScreen centered>
			<div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
				<h1 className="mb-4 text-6xl font-semibold">404</h1>
				<p className="mb-6 text-xl">{t('message')}</p>
				<Link href="/" className={buttonVariants()}>
					{t('goHome')}
				</Link>
			</div>
		</HostedPageStateScreen>
	);
}
