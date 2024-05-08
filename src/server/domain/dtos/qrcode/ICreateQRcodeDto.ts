import { type z } from "zod";
import { BaseDtoOmitFields } from "../IBaseDtoOmitFields";
import { QRcodeSchema } from "~/server/domain/types/QRcode";

/**
 * Schema for the Create QRcode DTO.
 */
export const CreateQRcodeDtoSchema = QRcodeSchema.omit({
  ...BaseDtoOmitFields,
  createdBy: true,
});

/**
 * Interface for the Create QRcode DTO.
 */
export type ICreateQRcodeDto = z.infer<typeof CreateQRcodeDtoSchema>;
