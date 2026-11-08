import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isServedOnThisHost, loadHostedPage } from '@/lib/hosted-page.server';
import { describeHostedPage, HostedPageView } from '@/components/hosted-page/registry';
import { HostedPageStateScreen } from '@/components/hosted-page/HostedPageStateScreen';
import { HostedPageUnavailable } from '@/components/hosted-page/HostedPageUnavailable';
import { QrCodeDisabledContent } from '@/components/QrCodeDisabledContent';
import { LinkBlockedContent } from '@/components/LinkBlockedContent';

interface HostedPageProps {
	params: Promise<{ locale: string; shortCode: string }>;
}

// Reached by rewrite from a scan or via the page link; the backend caches the payload briefly
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: HostedPageProps): Promise<Metadata> {
	const { shortCode } = await params;
	const result = await loadHostedPage(shortCode);
	if (result.status !== 'ok' || !(await isServedOnThisHost(result.page))) {
		return { title: { absolute: 'QRcodly' } };
	}

	const { title, description } = describeHostedPage(result.page);
	return {
		title: { absolute: title },
		description,
		openGraph: { type: 'website', title, description },
	};
}

export default async function HostedPage({ params }: HostedPageProps) {
	const { shortCode, locale } = await params;
	const result = await loadHostedPage(shortCode);

	switch (result.status) {
		case 'not_found':
			notFound();
		case 'disabled':
			return (
				<HostedPageStateScreen>
					<QrCodeDisabledContent locale={locale} />
				</HostedPageStateScreen>
			);
		case 'blocked':
			return (
				<HostedPageStateScreen centered>
					<LinkBlockedContent locale={locale} />
				</HostedPageStateScreen>
			);
		case 'unavailable':
			return <HostedPageUnavailable />;
		case 'ok':
			if (!(await isServedOnThisHost(result.page))) notFound();
			return <HostedPageView page={result.page} />;
	}
}
