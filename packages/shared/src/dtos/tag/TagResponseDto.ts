import { z } from 'zod';
import { TagSchema } from '../../schemas/Tag';

export const TagResponseDto = TagSchema.extend({
	qrCodeCount: z.number().optional().describe('Number of QR codes assigned to this tag'),
});
export type TTagResponseDto = z.infer<typeof TagResponseDto>;
