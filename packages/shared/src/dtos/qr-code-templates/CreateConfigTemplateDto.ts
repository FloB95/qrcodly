import { type z } from 'zod';
import { ConfigTemplateSchema } from '../../schemas/QrCodeConfigTemplate';

/**
 * Schema for the Create Config Template DTO.
 */
export const CreateConfigTemplateDto = ConfigTemplateSchema.pick({
	name: true,
	config: true,
});

/**
 * Type for the Create Config Template DTO.
 */
export type TCreateConfigTemplateDto = z.infer<typeof CreateConfigTemplateDto>;
