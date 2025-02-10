import { z } from "zod";
import { BaseEntitySchema } from "../entities/BaseEntity";
import { QrCodeOptionsSchema } from "./QRcode";

export const ConfigTemplateSchema = BaseEntitySchema.extend({
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
  createdBy: z.string(),
  name: z.string(),
});

export type TConfigTemplate = z.infer<typeof ConfigTemplateSchema>;
