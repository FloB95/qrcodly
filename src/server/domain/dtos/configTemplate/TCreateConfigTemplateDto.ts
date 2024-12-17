import { z } from "zod";
import { CreateQRcodeDtoSchema } from "../qrcode/TCreateQRcodeDto";

/**
 * Schema for the Create Config Template DTO.
 */
export const CreateConfigTemplateDtoSchema = z.object({
  config: CreateQRcodeDtoSchema._def.schema.pick({
    config: true,
  }),
});

/**
 * Type for the Create Config Template DTO.
 */
export type TCreateConfigTemplateDto = z.infer<
  typeof CreateConfigTemplateDtoSchema
>;
