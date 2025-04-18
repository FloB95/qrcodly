import { z } from 'zod';

export const IdRequestQueryDto = z.object({
	id: z.string().uuid(),
});
export type TIdRequestQueryDto = z.infer<typeof IdRequestQueryDto>;