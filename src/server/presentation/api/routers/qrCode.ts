import { QRcode, QrCodeOptionsSchema } from "~/server/domain/entities/QRcode";
import { db } from "~/server/infrastructure/db/drizzle";
import { qrCodeTable } from "~/server/infrastructure/db/drizzle/schema";
import { v4 as uuidv4 } from "uuid";
import { currentUser } from "@clerk/nextjs/server";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/presentation/api/trpc";

type NewQrCode = typeof qrCodeTable.$inferInsert;

export const qrCodeRouter = createTRPCRouter({
  create: publicProcedure
    .input(QrCodeOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      // TODO impelement controller, repository, and use case and store
      const user = await currentUser();
      const newId = uuidv4();
      const qrCode = new QRcode(newId, input, user?.id);

      await db
        .insert(qrCodeTable)
        .values({
          id: qrCode.id,
          config: qrCode.config,
          createdAt: qrCode.createdAt,
          createdBy: qrCode.createdBy,
          updatedAt: qrCode.updatedAt,
        } as NewQrCode)
        .execute();

      console.log(input);
    }),
});
