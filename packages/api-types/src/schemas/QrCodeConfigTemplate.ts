import { z } from 'zod';
import { BaseEntitySchema } from '../dtos/base/BaseEntity';
import { QrCodeOptionsSchema } from './QrCode';

export const ConfigTemplateSchema = BaseEntitySchema.extend({
	config: QrCodeOptionsSchema,
	createdBy: z.string(),
	name: z.string(),
});

export type TConfigTemplate = z.infer<typeof ConfigTemplateSchema>;
