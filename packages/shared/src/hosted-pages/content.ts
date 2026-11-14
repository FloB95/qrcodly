import type { TQrCodeContent } from '../schemas/QrCode';
import type { THostedPageType } from '../schemas/HostedPage';
import { isHostedPageContent, type THostedPageBody, type THostedPageContent } from './registry';

/**
 * What `qr_code.content` stores for a hosted type: only the type. The page itself lives in
 * `hosted_page`, reached through the code's short URL, so the data exists exactly once.
 */
export type THostedQrContentStub = { type: THostedPageType; data: Record<string, never> };
export type TStoredQrCodeContent =
	Exclude<TQrCodeContent, THostedPageContent> | THostedQrContentStub;

export function toStoredQrCodeContent(content: TQrCodeContent): TStoredQrCodeContent {
	return isHostedPageContent(content) ? { type: content.type, data: {} } : content;
}

/** The page a QR code's hosted content describes, without the QR code's own flags. */
export function toHostedPageBody(content: THostedPageContent): THostedPageBody {
	const { isDynamic: _isDynamic, ...data } = content.data;
	return { type: content.type, data } as THostedPageBody;
}

/** A stored page as QR code content, the shape the QR code API has always carried. */
export function toHostedQrContent(page: THostedPageBody): THostedPageContent {
	return { type: page.type, data: { ...page.data, isDynamic: true } } as THostedPageContent;
}
