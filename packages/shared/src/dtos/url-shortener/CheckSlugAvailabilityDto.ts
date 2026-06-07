import { z } from 'zod';
import { CustomSlugSchema } from '../../schemas/ShortUrl';

export const CheckSlugAvailabilityQueryDto = z.object({
	slug: z.string().min(1).max(100),
	customDomainId: z.uuid(),
});
export type TCheckSlugAvailabilityQueryDto = z.infer<typeof CheckSlugAvailabilityQueryDto>;

export const CheckSlugAvailabilityReason = z.enum(['invalid', 'reserved', 'taken']);
export type TCheckSlugAvailabilityReason = z.infer<typeof CheckSlugAvailabilityReason>;

export const CheckSlugAvailabilityResponseDto = z.object({
	available: z.boolean(),
	reason: CheckSlugAvailabilityReason.optional(),
});
export type TCheckSlugAvailabilityResponseDto = z.infer<typeof CheckSlugAvailabilityResponseDto>;

export { CustomSlugSchema };
