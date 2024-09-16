import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/presentation/api/trpc";
import { createQrCodeAction } from "../../controller/qrcode/CreateQRcodeController";
import { CreateQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import QRcodeRepository from "~/server/infrastructure/repositories/drizzle/QRcodeRepository";
import { DeleteQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/TDeleteQRcodeDto";
import { TRPCError } from "@trpc/server";

export const qrCodeRouter = createTRPCRouter({
  create: publicProcedure
    .input(CreateQRcodeDtoSchema)
    .mutation(async ({ input }) => await createQrCodeAction(input)),
  getMyQrCodes: protectedProcedure.query(async ({ ctx }) => {
    const repo = new QRcodeRepository();

    if (!ctx.currentUser) throw new Error("User not found.");

    const qrCodes = await repo.findByUserId(ctx.currentUser.id);
    return qrCodes;
  }),
  delete: protectedProcedure
    .input(DeleteQRcodeDtoSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.currentUser) throw new Error("User not found.");

      const repo = new QRcodeRepository();
      const qrCode = await repo.findOneById(input.id);

      if (!qrCode) throw new Error("QRcode not found.");

      if (qrCode.createdBy !== ctx.currentUser.id)
        throw new TRPCError({
          message: "Access denied",
          code: "UNAUTHORIZED",
        });

      const isDeleted = await repo.delete(qrCode);
      return isDeleted;
    }),
});
