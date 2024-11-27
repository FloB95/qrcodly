import { type z } from "zod";
import { BaseEntitySchema } from "../../entities/BaseEntity";
import { QRcodeSchema } from "../../types/QRcode";

/**
 * Schema for the QR code Response DTO.
 * Combines the base entity schema with the QR code schema and makes all fields optional.
 */
export const QRcodeResponseDtoSchema = BaseEntitySchema.merge(
  QRcodeSchema._def.schema,
);

/**
 * Type for the QR code Response DTO.
 * Inferred from the QRcodeResponseDtoSchema.
 */
export type TQRcodeResponseDto = z.infer<typeof QRcodeResponseDtoSchema>;
