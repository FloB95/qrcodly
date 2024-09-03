import { type inferProcedureInput } from "@trpc/server";
import { expect, test } from "vitest";

import { appRouter, type AppRouter } from "~/server/presentation/api/root";
import { db } from "../infrastructure/db/drizzle";

test("example router", async () => {
  const ctx = {
    headers: new Headers(),
    db: db,
    currentUser: null
  };
  const caller = appRouter.createCaller(ctx);
  type Input = inferProcedureInput<AppRouter["post"]["hello"]>;
  const input: Input = {
    text: "test",
  };

  const example = await caller.post.hello(input);

  expect(example).toMatchObject({ greeting: "Hello test" });
});
