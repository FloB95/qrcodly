import { type z } from 'zod';
import { ConfigTemplateSchema } from '../../schemas/QrCodeConfigTemplate';

/**
 * Schema for the Config Template Response DTO.
 */
export const ConfigTemplateResponseDto = ConfigTemplateSchema.omit({
	isPredefined: true,
});

/**
 * Type for the Config Template Response DTO.
 */
export type TConfigTemplateResponseDto = z.infer<typeof ConfigTemplateResponseDto>;
