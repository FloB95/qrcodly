import {
  createTRPCRouter,
  protectedProcedure
} from "~/server/presentation/api/trpc";
import { RateLimiter } from "~/server/infrastructure/ratelimit";
import { TRPCError } from "@trpc/server";
import { CreateConfigTemplateDtoSchema } from "~/server/domain/dtos/configTemplate/TCreateConfigTemplateDto";
import { createConfigTemplateControllerFactory } from "../../factories/ConfigTemplateControllerFactory";

export const qrCodeTemplateRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateConfigTemplateDtoSchema)
    .mutation(async ({ input }) => {
      const identifier = "api.qrcodeTemplate.create";
      const result = await RateLimiter.limit(identifier);
      // rate limiter error

      console.log("input", input);

      if (!result.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded",
        });
      }

      return await createConfigTemplateControllerFactory().handle(input);
    }),

  // delete: protectedProcedure
  //   .input(DeleteQRcodeDtoSchema)
  //   .mutation(
  //     async ({ input }) => await deleteQRcodeControllerFactory().handle(input),
  //   ),
});
