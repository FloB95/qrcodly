import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { Logger } from "next-axiom";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req, event) => {
  const logger = new Logger({ source: "middleware" }); // traffic, request
  logger.middleware(req);

  event.waitUntil(logger.flush());

  if (isProtectedRoute(req)) await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
