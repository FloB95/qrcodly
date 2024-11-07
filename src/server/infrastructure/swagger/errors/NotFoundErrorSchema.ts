import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { DefaultApiErrorResponseSchema } from "./DefaultErrorSchema";

export const NotFoundErrorResponseSchema = z
  .object({
    ...DefaultApiErrorResponseSchema.shape,
    code: z.number().default(404),
  })
  .refine((data) => data.code === 404, {
    message: "Error code must be 404",
    path: ["code"],
  })
  .describe("Not Found Response. The requested resource was not found");

const zodToJsonObj = zodToJsonSchema(NotFoundErrorResponseSchema, {
  $refStrategy: "none",
  target: "openApi3",
  definitions: {
    response: NotFoundErrorResponseSchema,
  },
});

export const NotFoundErrorResponseJsonSchema = {
  description: NotFoundErrorResponseSchema.description,
  schema: zodToJsonObj?.definitions?.response,
};
