import { z } from 'zod'

export const DefaultApiErrorResponseSchema = z.object({
  message: z.string(),
})
