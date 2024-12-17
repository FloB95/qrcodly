import { z } from "zod";

/**
 * Schema for the Delete QRcode DTO.
 */
export const DeleteQRcodeDtoSchema = z.object({
  id: z.string(),
});

/**
 * Type for the Delete QRcode DTO.
 */
export type TDeleteQRcodeDto = z.infer<typeof DeleteQRcodeDtoSchema>;
