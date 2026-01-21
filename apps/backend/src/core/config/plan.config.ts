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

export type BulkImportLimits = {
	maxRows: number;
	maxFileSizeBytes: number;
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
