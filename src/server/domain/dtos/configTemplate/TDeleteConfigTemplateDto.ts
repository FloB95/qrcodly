import { z } from "zod";

/**
 * Schema for the DeleteConfigTemplate DTO.
 */
export const DeleteConfigTemplateDtoSchema = z.object({
  id: z.string(),
});

/**
 * Type for the DeleteConfigTemplate DTO.
 * This type is inferred from the DeleteConfigTemplateDtoSchema and represents the data required to delete a configuration template.
 */
export type TDeleteConfigTemplateDto = z.infer<typeof DeleteConfigTemplateDtoSchema>;
