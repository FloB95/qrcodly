import { z } from 'zod';

export const AccountDeletionRequestResponseDto = z.object({
	/** When the open request was made; null when there is none (never requested, or revoked) */
	requestedAt: z.iso.datetime().nullable(),
	/**
	 * When the user confirmed the request through the link in their mail. Only a confirmed request
	 * counts: null means the request is still waiting for that confirmation, or there is none.
	 */
	confirmedAt: z.iso.datetime().nullable(),
});

export type TAccountDeletionRequestResponseDto = z.infer<typeof AccountDeletionRequestResponseDto>;
