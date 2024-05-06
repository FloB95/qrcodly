import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

import { createCaller } from "~/server/presentation/api/root";
import { createTRPCContext } from "~/server/presentation/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(() => {
  const heads = new Headers(headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

export const api = createCaller(createContext);
