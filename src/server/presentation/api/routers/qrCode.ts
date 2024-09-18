import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/presentation/api/trpc";
import { CreateQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/TCreateQRcodeDto";
import { DeleteQRcodeDtoSchema } from "~/server/domain/dtos/qrcode/TDeleteQRcodeDto";
import {
  createQRcodeControllerFactory,
  deleteQRcodeControllerFactory,
  getQRcodesControllerFactory,
} from "../../factories/QRcodeControllerFactory";

export const qrCodeRouter = createTRPCRouter({
  create: publicProcedure
    .input(CreateQRcodeDtoSchema)
    .mutation(
      async ({ input }) => await createQRcodeControllerFactory().handle(input),
    ),

  getMyQrCodes: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.currentUser) throw new Error("User not found.");

    return await getQRcodesControllerFactory().handle({
      page: 1,
      limit: 10,
      where: {
        createdBy: ctx.currentUser.id,
      },
    });
  }),

  delete: protectedProcedure
    .input(DeleteQRcodeDtoSchema)
    .mutation(
      async ({ input }) => await deleteQRcodeControllerFactory().handle(input),
    ),
});
