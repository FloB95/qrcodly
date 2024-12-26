import { z } from "zod";
import { QrCodeOptionsSchema } from "../../types/QRcode";

/**
 * Schema for the Create Config Template DTO.
 */
export const CreateConfigTemplateDtoSchema = z.object({
  config: QrCodeOptionsSchema.pick({
    width: true,
    height: true,
    image: true,
    margin: true,
    backgroundOptions: true,
    dotsOptions: true,
    cornersSquareOptions: true,
    cornersDotOptions: true,
  }),
  name: z.string().min(1).max(250),
});

/**
 * Type for the Create Config Template DTO.
 */
export type TCreateConfigTemplateDto = z.infer<
  typeof CreateConfigTemplateDtoSchema
>;
