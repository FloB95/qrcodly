import { z } from "zod";
import { BaseEntitySchema } from "../entities/BaseEntity";
import { QrCodeOptionsSchema } from "./QRcode";

export const ConfigTemplateSchema = BaseEntitySchema.extend({
  config: QrCodeOptionsSchema,
  createdBy: z.string(),
  name: z.string(),
});
