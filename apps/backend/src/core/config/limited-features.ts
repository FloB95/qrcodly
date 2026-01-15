import { type PlanName } from './plan.config';

export enum LimitedFeature {
	QR_MP3 = 'qr_mp3',
	QR_BULK_IMPORT = 'qr_bulk_import',
	API_REQUESTS = 'api_requests',
}

export const LIMITED_FEATURES: Record<PlanName, Record<string, number | null>> = {
	free: { [LimitedFeature.QR_MP3]: 2, [LimitedFeature.API_REQUESTS]: 50 },
	pro: {
		[LimitedFeature.QR_MP3]: null,
		[LimitedFeature.API_REQUESTS]: null,
		[LimitedFeature.QR_BULK_IMPORT]: null,
	},
};
