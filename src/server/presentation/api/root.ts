import {
  createCallerFactory,
  createTRPCRouter,
} from "~/server/presentation/api/trpc";
import { qrCodeRouter } from "./routers/qrCode";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  qrCode: qrCodeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

// export caller
export const createCaller = createCallerFactory(appRouter);
