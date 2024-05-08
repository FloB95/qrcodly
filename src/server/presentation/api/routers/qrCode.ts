import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/presentation/api/trpc";
import { QrCodeOptionsSchema } from "~/server/domain/types/QRcode";
import { createQrCodeAction } from "../../controller/QRcodeController";

export const qrCodeRouter = createTRPCRouter({
  create: publicProcedure
    .input(QrCodeOptionsSchema) // TODO replace with dto schema
    .mutation(async ({ input }) => await createQrCodeAction(input)),
});
