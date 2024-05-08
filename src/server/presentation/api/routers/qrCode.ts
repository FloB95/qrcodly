import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/presentation/api/trpc";
import { createQrCodeAction } from "../../controller/QRcodeController";
import { CreateQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/ICreateQRcodeDto";
import QRcodeRepository from "~/server/infrastructure/repositories/drizzle/QRcodeRepository";

export const qrCodeRouter = createTRPCRouter({
  create: publicProcedure
    .input(CreateQRcodeDtoSchema)
    .mutation(async ({ input }) => await createQrCodeAction(input)),
  getMyQrCodes: protectedProcedure.query(async ({ ctx }) => {
    const repo = new QRcodeRepository();
    const qrCodes = await repo.findByUserId(ctx.currentUser.id);
    return qrCodes;
  }),
});
