import zodToJsonSchema from "zod-to-json-schema";
import { CreateQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { BadRequestErrorResponseJsonSchema } from "../errors/BadRequestSchema";

export const CreateQRcodeResponseJsonSchema = zodToJsonSchema(
  CreateQRcodeDtoSchema,
  {
    $refStrategy: "none",
    target: "openApi3",
    definitions: {
      response: CreateQRcodeDtoSchema,
    },
  },
);

export const CreateQRcodeOpenAPISchema = {
  description: "Create a QR Code",
  tags: ["QRcode"],
  requestBody: {
    description: "QR Code data",
    required: true,
    content: {
      "application/json": {
        schema: CreateQRcodeResponseJsonSchema?.definitions?.response,
      },
    },
  },
  responses: {
    201: {
      description: "QR Code created successfully and returned as File",
    },
    400: BadRequestErrorResponseJsonSchema,
    // 401: UnauthenticatedErrorResponseJsonSchema,
  },
};
