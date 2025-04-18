import { type z } from 'zod';
import { ConfigTemplateSchema } from '../../schemas/QrCodeConfigTemplate';

/**
 * Schema for the Config Template Response DTO.
 */
export const ConfigTemplateResponseDtoSchema = ConfigTemplateSchema;

/**
 * Type for the Config Template Response DTO.
 */
export type TConfigTemplateResponseDto = z.infer<typeof ConfigTemplateResponseDtoSchema>;
