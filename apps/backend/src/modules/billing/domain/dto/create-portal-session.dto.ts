import { z } from 'zod';

export const CreatePortalSessionDto = z.object({
	locale: z.string().optional(),
});

export type TCreatePortalSessionDto = z.infer<typeof CreatePortalSessionDto>;
