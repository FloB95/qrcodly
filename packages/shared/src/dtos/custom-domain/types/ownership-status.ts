import { z } from 'zod';

/**
 * Ownership verification status.
 */
export const OwnershipStatusSchema = z.enum(['pending', 'verified']);

export type TOwnershipStatus = z.infer<typeof OwnershipStatusSchema>;
