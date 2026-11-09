import { LinkBlockedContent } from '@/components/LinkBlockedContent';
import type { DefaultPageParams } from '@/types/page';
import type { Metadata } from 'next';

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
	return <LinkBlockedContent locale={locale} />;
}
