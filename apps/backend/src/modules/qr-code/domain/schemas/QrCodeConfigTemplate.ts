import { z } from 'zod';
import { QrCodeOptionsSchema } from './QrCode';
import { AbstractEntitySchema } from '@/core/domain/schema/AbstractEntitySchema';

export const ConfigTemplateSchema = AbstractEntitySchema.extend({
	config: QrCodeOptionsSchema,
	createdBy: z.string(),
	name: z.string(),
});

export type TConfigTemplate = z.infer<typeof ConfigTemplateSchema>;
