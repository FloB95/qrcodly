import { z } from 'zod';

export const IdRequestQueryDto = z.object({
	id: z.uuid(),
});
export type TIdRequestQueryDto = z.infer<typeof IdRequestQueryDto>;
