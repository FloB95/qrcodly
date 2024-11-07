import { z } from "zod";
import {
  FileExtension,
  QrCodeOptionsSchema,
} from "~/server/domain/types/QRcode";

/**
 * Schema for the Create QRcode DTO.
 */
export const CreateQRcodeDtoSchema = z.object({
  fileType: FileExtension.default("svg").describe("The download file type."),
  config: QrCodeOptionsSchema.pick({
    width: true,
    height: true,
    contentType: true,
    data: true,
    originalData: true,
    image: true,
    margin: true,
    backgroundOptions: true,
    dotsOptions: true,
    cornersSquareOptions: true,
    cornersDotOptions: true,
  }).describe("The QRcode configuration."),
});

/**
 * Interface for the Create QRcode DTO.
 */
export type TCreateQRcodeDto = z.infer<typeof CreateQRcodeDtoSchema>;
