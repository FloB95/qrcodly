import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { DefaultApiErrorResponseSchema } from "./DefaultErrorSchema";

const FieldErrorSchema = z.object({
  code: z.string(),
  expected: z.string().optional(),
  received: z.string().optional(),
  path: z.array(z.string()),
  message: z.string(),
});

const BadRequestErrorResponseSchema = z
  .object({
    ...DefaultApiErrorResponseSchema.shape,
    code: z.number().default(400),
    fieldErrors: z.array(FieldErrorSchema).optional(),
  })
  .refine((data) => data.code === 400, {
    message: "Error code must be 400",
    path: ["code"],
  })
  .describe("Bad Request Response. Your request has invalid fields. Errors are zod schema errors.");

const zodToJsonObj = zodToJsonSchema(BadRequestErrorResponseSchema, {
  $refStrategy: "none",
  target: "openApi3",
  definitions: {
    response: BadRequestErrorResponseSchema,
  },
});

export const BadRequestErrorResponseJsonSchema = {
  description: BadRequestErrorResponseSchema.description,
  schema: zodToJsonObj?.definitions?.response,
};
