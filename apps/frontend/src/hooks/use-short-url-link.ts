'use client';

import { useMemo } from 'react';
import { useCustomDomainLookup } from '@/lib/api/custom-domain';
import { createLinkFromShortUrl } from '@/lib/utils';
import type { TShortUrlResponseDto, TShortUrlWithCustomDomainResponseDto } from '@shared/schemas';

type ShortUrlInput = TShortUrlResponseDto | TShortUrlWithCustomDomainResponseDto;

/**
 * Hook to get a short URL link with automatic custom domain lookup.
 * Uses React Query cache to resolve customDomainId to the full domain object.
 *
 * @param shortUrl - The short URL object (can have customDomainId or embedded customDomain)
 * @param short - If true, returns URL without protocol (for display)
 * @returns Object with the link and loading state
 */
export function useShortUrlLink(
	shortUrl: ShortUrlInput | null | undefined,
	short = false,
): { link: string | null; isLoading: boolean } {
	// Get customDomainId if it exists and shortUrl doesn't have embedded customDomain
	const customDomainId = shortUrl && !('customDomain' in shortUrl) ? shortUrl.customDomainId : null;

	const { domain, isLoading } = useCustomDomainLookup(customDomainId);

	const link = useMemo(() => {
		if (!shortUrl) return null;
		return createLinkFromShortUrl(shortUrl, { short, customDomain: domain });
	}, [shortUrl, short, domain]);

	return { link, isLoading };
}
