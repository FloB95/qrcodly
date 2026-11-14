import { z } from 'zod';
import type { TQrCodeContent } from '../../schemas/QrCode';
import { safeHttpUrl } from '../../schemas/SafeUrl';
import { getHostedInputIssues } from '../../hosted-pages/registry';

const httpUrlSchema = safeHttpUrl(1000);

/**
 * Validates that URL fields in QR code content use proper HTTP/HTTPS URLs without credentials.
 * The entity schema uses lenient z.url() for backwards compatibility with existing data,
 * but input DTOs (Create/Update) enforce it at the API boundary.
 */
export function validateContentHttpUrls(
	content: TQrCodeContent | undefined,
	ctx: z.RefinementCtx,
	basePath: string[] = ['content', 'data'],
) {
	if (!content) return;

	if (content.type === 'url') {
		const result = httpUrlSchema.safeParse(content.data.url);
		if (!result.success) {
			ctx.addIssue({
				code: 'custom',
				message: 'URL must be a valid HTTP or HTTPS URL',
				path: [...basePath, 'url'],
			});
		}
	}

	if (content.type === 'vCard' && content.data.website) {
		const result = httpUrlSchema.safeParse(content.data.website);
		if (!result.success) {
			ctx.addIssue({
				code: 'custom',
				message: 'Website must be a valid HTTP or HTTPS URL',
				path: [...basePath, 'website'],
			});
		}
	}

	if (content.type === 'event' && content.data.url) {
		const result = httpUrlSchema.safeParse(content.data.url);
		if (!result.success) {
			ctx.addIssue({
				code: 'custom',
				message: 'URL must be a valid HTTP or HTTPS URL',
				path: [...basePath, 'url'],
			});
		}
	}
}

/** Cross-field rules of hosted page types, checked where content comes in (create, update). */
export function validateHostedPageContent(
	content: TQrCodeContent | undefined,
	ctx: z.RefinementCtx,
	basePath: string[] = ['content', 'data'],
) {
	if (!content) return;
	for (const issue of getHostedInputIssues(content)) {
		ctx.addIssue({ code: 'custom', message: issue.message, path: [...basePath, ...issue.path] });
	}
}
