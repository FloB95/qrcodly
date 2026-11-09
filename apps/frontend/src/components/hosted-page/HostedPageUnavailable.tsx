import { useTranslations } from 'next-intl';
import { HostedPageStateScreen } from './HostedPageStateScreen';

const RELOAD_AFTER_SECONDS = 8;

/** The backend is busy or briefly down: the visitor waits a moment instead of seeing "not found". */
export function HostedPageUnavailable() {
	const t = useTranslations('hostedPage.unavailable');
	return (
		<HostedPageStateScreen centered>
			<meta httpEquiv="refresh" content={String(RELOAD_AFTER_SECONDS)} />
			<div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
				<h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
					{t('title')}
				</h1>
				<p className="mt-4 text-base text-pretty text-gray-700 sm:text-lg">{t('description')}</p>
			</div>
		</HostedPageStateScreen>
	);
}
