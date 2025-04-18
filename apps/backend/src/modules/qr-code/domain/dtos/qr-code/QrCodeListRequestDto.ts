import { z } from 'zod';

/**
 * Schema for the QR code Response DTO.
 * Combines the base entity schema with the QR code schema and makes all fields optional.
 */
export const QRcodesRequestDtoSchema = z.object({
	createdBy: z.string().optional(),
});

/**
 * Type for the QR code Response DTO.
 * Inferred from the QRcodeResponseDtoSchema.
 */
export type TQRcodesRequestDto = z.infer<typeof QRcodesRequestDtoSchema>;
