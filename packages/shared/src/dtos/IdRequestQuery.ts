import { z } from 'zod';

export const IdRequestQueryDto = z.object({
	id: z.uuid().describe('Resource UUID'),
});
export type TIdRequestQueryDto = z.infer<typeof IdRequestQueryDto>;
