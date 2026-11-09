import { z } from 'zod';

/**
 * Schemas, or values of an enum, that exist in the API but stay out of the public OpenAPI
 * document (hosted pages today). Only the JSON Schema for the docs drops them; validation and
 * clients are unaffected.
 */
export const undocumentedSchemas = z.registry<{ values?: readonly string[] }>();
