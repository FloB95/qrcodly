import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/presentation/api/trpc";
import { createQrCodeAction } from "../../controller/QRcodeController";
import { CreateQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/ICreateQRcodeDto";

export const qrCodeRouter = createTRPCRouter({
  create: publicProcedure
    .input(CreateQRcodeDtoSchema)
    .mutation(async ({ input }) => await createQrCodeAction(input)),
});
