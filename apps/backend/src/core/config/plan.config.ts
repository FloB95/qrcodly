import { type TQrCodeContentType } from '@shared/schemas';

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
 *  - pro: 50 CSV Lines and 2 MB filesize
 */
export type BulkImportLimits = {
	maxRows: number;
	maxFileSizeBytes: number;
};

/**
 * Plan limits for tags per QR code.
 * - free: 1 tag per QR code
 * - pro: 3 tags per QR code
 */
export const TAGS_PER_QR_CODE_PLAN_LIMITS: Record<PlanName, number> = {
	free: 1,
	pro: 3,
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
