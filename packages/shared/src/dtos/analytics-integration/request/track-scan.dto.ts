import { z } from 'zod';

export const TrackScanDto = z.object({
	url: z.string().min(1),
	userAgent: z.string(),
	hostname: z.string(),
	language: z.string(),
	referrer: z.string(),
	ip: z.string(),
	deviceType: z.string(),
	browserName: z.string(),
});

export type TTrackScanDto = z.infer<typeof TrackScanDto>;
