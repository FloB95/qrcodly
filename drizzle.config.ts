import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  schema: "./src/server/infrastructure/db/drizzle/schema.ts",
  out: "./src/server/infrastructure/db/drizzle/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: env.DATABASE_URL,
    host: "localhost",
    user: "root",
    password: "root",
    database: "qrcodly",
    port: Number(3306),
  },
  tablesFilter: ["qrcodly_*"],
} satisfies Config;
