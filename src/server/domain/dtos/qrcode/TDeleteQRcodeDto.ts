import { z } from "zod";

/**
 * Schema for the Create QRcode DTO.
 */
export const DeleteQRcodeDtoSchema = z.object({
  id: z.string(),
});

/**
 * Interface for the Create QRcode DTO.
 */
export type TDeleteQRcodeDto = z.infer<typeof DeleteQRcodeDtoSchema>;
