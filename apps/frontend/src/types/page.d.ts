import type { SupportedLanguages } from '@/i18n/routing';

export type DefaultPageParams = {
	params: Promise<{ locale: SupportedLanguages }>;
};
