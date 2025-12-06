import { type z } from 'zod';
import { ConfigTemplateSchema } from '../../schemas/QrCodeConfigTemplate';

/**
 * Schema for the Update Config Template DTO.
 */
export const UpdateConfigTemplateDto = ConfigTemplateSchema.pick({
	name: true,
	config: true,
}).partial();

/**
 * Type for the Update Config Template DTO.
 */
export type TUpdateConfigTemplateDto = z.infer<typeof UpdateConfigTemplateDto>;
