import { z } from 'zod';

export const AccountDeletionRequestResponseDto = z.object({
	/** When the open request was made; null when there is none (never requested, or revoked) */
	requestedAt: z.iso.datetime().nullable(),
});

export type TAccountDeletionRequestResponseDto = z.infer<typeof AccountDeletionRequestResponseDto>;
