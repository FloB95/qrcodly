import '@/styles/globals.css';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
	robots: { index: false, follow: false },
};

/**
 * Customer pages, often on the customer's own domain, get a layout of their own: none of the
 * site's trackers, ads tag or login scripts run for the people who scan a customer's code. The
 * pages translate on the server only, so no dictionary is sent to the browser.
 */
export default async function HostedPageLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) notFound();

	return (
		<html lang={locale} className="light" suppressHydrationWarning>
			<body className="flex min-h-screen flex-col font-sans" suppressHydrationWarning>
				{children}
			</body>
		</html>
	);
}
