import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	getDefaultContentByType,
	isDynamic,
	type TCustomDomainResponseDto,
	type TQrCodeContent,
	type TQrCodeOptions,
	type TShortUrl,
} from '@shared/schemas';
import { createLinkFromShortUrl } from './utils';
import type { Options } from 'qr-code-styling';

/**
 * Get the short URL string for rendering if needed
 * @param content - The QR code content
 * @param shortUrl - The short URL object (with customDomainId)
 * @param customDomain - Optional resolved custom domain object
 */
export function getShortUrlForRendering(
	content: TQrCodeContent,
	shortUrl?: TShortUrl,
	customDomain?: TCustomDomainResponseDto | null,
): string | undefined {
	if (!isDynamic(content) || !shortUrl) {
		return undefined;
	}
	return createLinkFromShortUrl(shortUrl, { customDomain });
}

/**
 * Convert QR code data to QRCodeStyling options.
 * If qrCodeData is provided (from database), use it directly.
 * Otherwise, compute it from content and shortUrl (for preview/generator).
 *
 * @param config - QR code styling configuration
 * @param content - QR code content
 * @param options - Optional settings
 * @param options.qrCodeData - Pre-computed QR code data from database (takes priority)
 * @param options.shortUrl - Short URL object for computing data on the fly
 * @param options.customDomain - Custom domain for computing data on the fly
 */
export function getQrCodeStylingOptions(
	config: TQrCodeOptions,
	content: TQrCodeContent,
	options?: {
		qrCodeData?: string | null;
		shortUrl?: TShortUrl;
		customDomain?: TCustomDomainResponseDto | null;
	},
): Options {
	const { qrCodeData, shortUrl, customDomain } = options ?? {};

	// Use pre-computed qrCodeData if available (from saved QR codes)
	const data =
		qrCodeData ??
		convertQRCodeDataToStringByType(
			content,
			getShortUrlForRendering(content, shortUrl, customDomain),
		);

	return {
		...convertQrCodeOptionsToLibraryOptions(config),
		data,
	};
}

/**
 * Check if content is at default state (not ready for download)
 */
export function isContentAtDefault(content: TQrCodeContent, isSignedIn = false): boolean {
	return (
		JSON.stringify(content) === JSON.stringify(getDefaultContentByType(content.type, isSignedIn))
	);
}

/**
 * Check if QR code data has changed
 */
export function hasQrCodeChanged(
	current: { config: TQrCodeOptions; content: TQrCodeContent },
	latest?: { config: TQrCodeOptions; content: TQrCodeContent },
): boolean {
	if (!latest) return true;
	return (
		JSON.stringify(current.content) !== JSON.stringify(latest.content) ||
		JSON.stringify(current.config) !== JSON.stringify(latest.config)
	);
}
