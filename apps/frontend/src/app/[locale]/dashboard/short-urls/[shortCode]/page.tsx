import { apiRequest } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import type { TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';
import { ShortUrlDetailContent } from '@/components/dashboard/shortUrl/ShortUrlDetailContent';

interface ShortUrlDetailProps {
	params: Promise<{
		shortCode: string;
	}>;
}

export const dynamic = 'force-dynamic';

export default async function ShortUrlDetailPage({ params }: ShortUrlDetailProps) {
	const { shortCode } = await params;

	let shortUrl: TShortUrlWithCustomDomainResponseDto | null = null;
	try {
		const { getToken } = await auth();
		const token = await getToken();

		shortUrl = await apiRequest<TShortUrlWithCustomDomainResponseDto>(
			`/short-url/${shortCode}/detail`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			},
		);
	} catch (error) {
		console.error('Failed to fetch short URL details:', error);
	}

	if (!shortUrl) {
		notFound();
	}

	return <ShortUrlDetailContent shortUrl={shortUrl} />;
}
