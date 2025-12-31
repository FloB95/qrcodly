import {
	convertQRCodeDataToStringByType,
	convertQrCodeOptionsToLibraryOptions,
	getDefaultContentByType,
	isDynamic,
	type TQrCodeContent,
	type TQrCodeOptions,
	type TShortUrl,
} from '@shared/schemas';
import { getShortUrlFromCode } from './utils';
import type { Options } from 'qr-code-styling';

/**
 * Get the short URL string for rendering if needed
 */
export function getShortUrlForRendering(
	content: TQrCodeContent,
	shortUrl?: TShortUrl,
): string | undefined {
	if (!isDynamic(content) || !shortUrl) {
		return undefined;
	}
	return getShortUrlFromCode(shortUrl.shortCode);
}

/**
 * Convert QR code data to QRCodeStyling options
 */
export function getQrCodeStylingOptions(
	config: TQrCodeOptions,
	content: TQrCodeContent,
	shortUrl?: TShortUrl,
): Options {
	return {
		...convertQrCodeOptionsToLibraryOptions(config),
		data: convertQRCodeDataToStringByType(content, getShortUrlForRendering(content, shortUrl)),
	};
}

/**
 * Check if content is at default state (not ready for download)
 */
export function isContentAtDefault(content: TQrCodeContent): boolean {
	return JSON.stringify(content) === JSON.stringify(getDefaultContentByType(content.type));
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
