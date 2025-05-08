import { z } from 'zod';
import { QrCodeOptionsSchema } from './QrCode';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const ConfigTemplateSchema = AbstractEntitySchema.extend({
	config: QrCodeOptionsSchema,
	createdBy: z.string(),
	name: z.string().max(32),
	previewImage: z.string().nullable(),
	isPredefined: z.boolean(),
});

export type TConfigTemplate = z.infer<typeof ConfigTemplateSchema>;
