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
 * - pro: 3 domains max
 */
export const CUSTOM_DOMAIN_PLAN_LIMITS: Record<PlanName, number> = {
	free: 0,
	pro: 3,
};
