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
