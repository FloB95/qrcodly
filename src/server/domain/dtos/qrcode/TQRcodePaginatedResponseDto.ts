import { type z } from "zod";
import { PaginationResponseDtoSchema } from "../IPaginationDto";
import { QRcodeResponseDtoSchema } from "./TQRcodeResponseDto";

/**
 * Schema for the QR code Pagination Response DTO.
 * Combines the pagination response schema with the QR code response schema.
 */
export const QRcodePaginationResponseSchema = PaginationResponseDtoSchema(
  QRcodeResponseDtoSchema,
);

/**
 * Type for the QR code Paginated Response DTO.
 * Inferred from the QRcodePaginationResponseSchema.
 */
export type TQRcodePaginatedResponseDto = z.infer<
  typeof QRcodePaginationResponseSchema
>;
