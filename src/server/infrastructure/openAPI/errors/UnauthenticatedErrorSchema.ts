import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { DefaultApiErrorResponseSchema } from "./DefaultErrorSchema";

export const UnauthenticatedErrorResponseSchema = z
  .object({
    ...DefaultApiErrorResponseSchema.shape,
    code: z.number().default(401),
  })
  .refine((data) => data.code === 401, {
    message: "Error code must be 401",
    path: ["code"],
  })
  .describe("Unauthenticated Response. The request was not authenticated.");

const zodToJsonObj = zodToJsonSchema(UnauthenticatedErrorResponseSchema, {
  $refStrategy: 'none',
  target: "openApi3",
  definitions: {
    response: UnauthenticatedErrorResponseSchema,
  },
});

export const UnauthenticatedErrorResponseJsonSchema = {
  description: UnauthenticatedErrorResponseSchema.description,
  schema: zodToJsonObj?.definitions?.response,
};
