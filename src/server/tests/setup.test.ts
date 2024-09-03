import { type inferProcedureInput } from "@trpc/server";
import { expect, test } from "vitest";

import { createCaller, type AppRouter } from "~/server/presentation/api/root";
import { db } from "../infrastructure/db/drizzle";

test("example router", async () => {
  const ctx = {
    headers: new Headers(),
    db: db,
    currentUser: null,
  };
  const caller = createCaller(ctx);
  type Input = inferProcedureInput<AppRouter["post"]["hello"]>;
  const input: Input = {
    text: "test",
  };

  const example = await caller.post.hello(input);

  expect(example).toMatchObject({ greeting: "Hello test" });
});
