import { z } from 'zod';
import { QrCodeOptionsSchema } from './QrCode';
import { AbstractEntitySchema } from './AbstractEntitySchema';

export const CONFIG_TEMPLATE_NAME_MAX_LENGTH = 50;

export const ConfigTemplateSchema = AbstractEntitySchema.extend({
	config: QrCodeOptionsSchema.describe('QR code styling configuration stored in this template'),
	createdBy: z.string().describe('User ID of the template owner'),
	name: z
		.string()
		.max(CONFIG_TEMPLATE_NAME_MAX_LENGTH)
		.describe('Template name (max 50 characters)'),
	previewImage: z
		.string()
		.nullable()
		.describe('URL to a preview image showing the template styling'),
	isPredefined: z
		.boolean()
		.describe('Whether this is a system-provided template available to all users'),
});

export type TConfigTemplate = z.infer<typeof ConfigTemplateSchema>;
