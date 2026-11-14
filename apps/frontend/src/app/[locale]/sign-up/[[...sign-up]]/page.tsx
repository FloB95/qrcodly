import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { signUpPath } from '@/i18n/routing';
import type { DefaultPageParams } from '@/types/page';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'auth' });
	return {
		title: t('signUp.metaTitle'),
		robots: { index: false, follow: false },
	};
}

// Counterpart of the sign-in page: path routing for Clerk's sub-routes (/continue, /verify-*),
// a ?redirect_url= carried over from sign-in still wins over the fallbacks.
// unsafeMetadata.locale is the default newsletter language when the subscriber is created (only
// "de" counts, else English).
export default async function SignUpPage({ params }: DefaultPageParams) {
	const { locale } = await params;

	return (
		<AuthPageLayout locale={locale} flow="signUp">
			<SignUp
				path={signUpPath(locale)}
				fallbackRedirectUrl={`/${locale}/signup-success`}
				signInFallbackRedirectUrl={`/${locale}/dashboard/qr-codes`}
				unsafeMetadata={{ locale }}
			/>
		</AuthPageLayout>
	);
}
