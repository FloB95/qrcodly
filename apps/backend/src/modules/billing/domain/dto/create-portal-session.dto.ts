import { z } from 'zod';

export const CreatePortalSessionDto = z.object({
	locale: z.string().optional(),
	returnUrl: z.url().optional(),
});

export type TCreatePortalSessionDto = z.infer<typeof CreatePortalSessionDto>;
