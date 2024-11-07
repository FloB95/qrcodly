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

export const CreateQRcodeSwaggerSchema = {
  description: "Create a QR Code",
  tags: ["QRcode"],
  parameters: [
    {
      name: "body",
      description: "QR Code data",
      schema: CreateQRcodeResponseJsonSchema?.definitions?.response,
      in: "body",
    },
  ],
  responses: {
    201: {
      description: "QR Code created successfully and returned as File",
    },
    400: BadRequestErrorResponseJsonSchema,
    // 401: UnauthenticatedErrorResponseJsonSchema,
  },
};
