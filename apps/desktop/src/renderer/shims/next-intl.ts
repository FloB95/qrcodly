// Re-export from use-intl, which is the framework-agnostic core of next-intl
export {
	useTranslations,
	useLocale,
	useFormatter,
	useNow,
	useTimeZone,
	IntlProvider as NextIntlClientProvider,
} from 'use-intl';

export { hasLocale } from 'use-intl';
