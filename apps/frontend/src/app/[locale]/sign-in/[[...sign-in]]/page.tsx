import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { signInPath } from '@/i18n/routing';
import type { DefaultPageParams } from '@/types/page';

export async function generateMetadata({ params }: DefaultPageParams): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: 'auth' });
	return {
		title: t('signIn.metaTitle'),
		robots: { index: false, follow: false },
	};
}

// Rendered by us so it shows the newsletter notice from our Clerk localization (Clerk's hosted
// pages would not). Path routing (catch-all route), so the ?redirect_url= of
// auth().redirectToSignIn() wins and Clerk's sub-routes like /tasks resolve.
export default async function SignInPage({ params }: DefaultPageParams) {
	const { locale } = await params;

	return (
		<AuthPageLayout locale={locale} flow="signIn">
			<SignIn
				path={signInPath(locale)}
				fallbackRedirectUrl={`/${locale}/dashboard/qr-codes`}
				signUpFallbackRedirectUrl={`/${locale}/signup-success`}
				// passed on to sign-up when a new user is moved over (newsletter language)
				unsafeMetadata={{ locale }}
			/>
		</AuthPageLayout>
	);
}
