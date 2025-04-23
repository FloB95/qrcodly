import { type z } from 'zod';
import { AnalyticsSchema } from '../../schemas/AnalyticsSchema';

/**
 * Schema for the Analytics Response DTO.
 * This represents the structure of the analytics data returned by the API.
 */
export const AnalyticsResponseDto = AnalyticsSchema;

/**
 * Type definition for the Analytics Response DTO.
 * This type is inferred from the AnalyticsResponseDto schema.
 */
export type TAnalyticsResponseDto = z.infer<typeof AnalyticsResponseDto>;
