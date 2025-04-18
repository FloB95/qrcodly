import { z } from 'zod';

/**
 * Schema for the QR code Response DTO.
 * Combines the base entity schema with the QR code schema and makes all fields optional.
 */
export const QrCodesRequestDtoSchema = z.object({
	createdBy: z.string().optional(),
});

/**
 * Type for the QR code Response DTO.
 * Inferred from the QRcodeResponseDtoSchema.
 */
export type TQrCodesRequestDto = z.infer<typeof QrCodesRequestDtoSchema>;
