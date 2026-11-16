import { z } from 'zod';

export const ConfirmAccountDeletionDto = z.object({
	/** The secret from the confirmation link */
	token: z.string().min(20).max(200),
});

export type TConfirmAccountDeletionDto = z.infer<typeof ConfirmAccountDeletionDto>;
