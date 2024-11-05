import { type z } from "zod";
import { QrCodeOptionsSchema } from "~/server/domain/types/QRcode";

/**
 * Schema for the Create QRcode DTO.
 */
export const CreateQRcodeDtoSchema = QrCodeOptionsSchema.pick({
  width: true,
  height: true,
  contentType: true,
  data: true,
  originalData: true,
  image: true,
  margin: true,
  dotsOptions: true,
  backgroundOptions: true,
  cornersSquareOptions: true,
  cornersDotOptions: true,
});
/**
 * Interface for the Create QRcode DTO.
 */
export type TCreateQRcodeDto = z.infer<typeof CreateQRcodeDtoSchema>;
