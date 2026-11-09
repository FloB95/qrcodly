import { type THostedUploadKind, type TQrCodeContentType } from '@shared/schemas';

export enum PlanName {
	FREE = 'free',
	PRO = 'pro',
}

export const QR_CODE_PLAN_LIMITS: Record<
	PlanName,
	Partial<Record<TQrCodeContentType, number | null>>
> = {
	free: {},
	pro: {},
};

/**
 * Plan limits for custom domains.
 * - free: 0 domains (not available)
 * - pro: 1 domain max
 */
export const CUSTOM_DOMAIN_PLAN_LIMITS: Record<PlanName, number> = {
	free: 0,
	pro: 1,
};

/**
 * Plan limits for Bulk imports
 *  - free: 10 CSV Lines and 0.5 MB filesize
 *  - pro: 50 CSV Lines and 2 MB filesize (matches UPLOAD_LIMIT and the advertised plan copy)
 */
export type BulkImportLimits = {
	maxRows: number;
	maxFileSizeBytes: number;
};

/**
 * Plan limits for analytics integrations.
 * - free: 0 integrations (not available)
 * - pro: 1 integration (either GA4 or Matomo)
 */
export const ANALYTICS_INTEGRATION_PLAN_LIMITS: Record<PlanName, number> = {
	free: 0,
	pro: 1,
};

export const BULK_IMPORT_PLAN_LIMITS: Record<PlanName, BulkImportLimits> = {
	free: {
		maxRows: 10,
		maxFileSizeBytes: 0.5 * 1024 * 1024, // 0.5MB
	},
	pro: {
		maxRows: 50,
		maxFileSizeBytes: 2 * 1024 * 1024, // 2MB
	},
};

/**
 * Plan limits for hosted pages, shared by every hosted page type.
 * Hosting user files is a Pro feature: the generator is open to everyone, and free uploads
 * would invite spam and malware. When Pro ends, the pages go offline together with the other Pro
 * features once the grace period is over, and come back as they were on resubscribing.
 */
export type HostedPageLimits = {
	/** Codes whose scan shows a landing page. A code that opens its file directly takes none. */
	maxLandingPages: number;
	/** Stored files of every kind (documents, cover and logo images) across all hosted codes. */
	maxFiles: number;
	maxFileSizeBytes: Record<THostedUploadKind, number>;
	/** Whether the "Made with QRcodly" footer may be hidden. */
	brandingRemovable: boolean;
	/** Whether the page uses the owner's primary color instead of the default theme. */
	customTheme: boolean;
};

export const HOSTED_PAGE_PLAN_LIMITS: Record<PlanName, HostedPageLimits> = {
	free: {
		maxLandingPages: 0,
		maxFiles: 0,
		maxFileSizeBytes: { pdf: 0, image: 0 },
		brandingRemovable: false,
		customTheme: false,
	},
	pro: {
		maxLandingPages: 15,
		maxFiles: 60,
		maxFileSizeBytes: { pdf: 25 * 1024 * 1024, image: 2 * 1024 * 1024 },
		brandingRemovable: true,
		customTheme: true,
	},
};
