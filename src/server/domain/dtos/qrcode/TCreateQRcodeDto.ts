import { z } from "zod";
import {
  FileExtension,
  QrCodeContentOriginalDataSchema,
  QrCodeContentType,
  QrCodeOptionsSchema,
  TextInputSchema,
  UrlInputSchema,
  VCardInputSchema,
  WifiInputSchema,
} from "~/server/domain/types/QRcode";

/**
 * Schema for the Create QRcode DTO.
 */
export const CreateQRcodeDtoSchema = z
  .object({
    fileType: FileExtension.default("svg").describe("The download file type."),
    data: QrCodeContentOriginalDataSchema,
    contentType: QrCodeContentType,
    config: QrCodeOptionsSchema.pick({
      width: true,
      height: true,
      image: true,
      margin: true,
      backgroundOptions: true,
      dotsOptions: true,
      cornersSquareOptions: true,
      cornersDotOptions: true,
    }).describe("The QRcode configuration."),
  })
  .superRefine((values, ctx) => {
    const { contentType, data } = values;

    // Validate the original data based on the content type
    switch (contentType) {
      case "url":
        if (!UrlInputSchema.safeParse(data).success) {
          ctx.addIssue({
            code: "custom",
            path: ["data"],
            message: "Invalid URL format.",
          });
        }
        break;

      case "text":
        if (!TextInputSchema.safeParse(data).success) {
          ctx.addIssue({
            code: "custom",
            path: ["data"],
            message:
              "Text must be a string with a maximum length of 1000 characters.",
          });
        }
        break;

      case "wifi":
        if (!WifiInputSchema.safeParse(data).success) {
          ctx.addIssue({
            code: "custom",
            path: ["data"],
            message: "Invalid WiFi configuration.",
          });
        }
        break;

      case "vCard":
        if (!VCardInputSchema.safeParse(data).success) {
          ctx.addIssue({
            code: "custom",
            path: ["data"],
            message: "Invalid vCard configuration.",
          });
        }
        break;

      default:
        ctx.addIssue({
          code: "custom",
          path: ["contentType"],
          message: "Unsupported content type.",
        });
    }
  });

/**
 * Interface for the Create QRcode DTO.
 */
export type TCreateQRcodeDto = z.infer<typeof CreateQRcodeDtoSchema>;
