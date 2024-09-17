import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const conn = globalForDb.conn ?? createPool({ uri: env.DATABASE_URL });
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema, mode: "default", logger: false });

// TODO - This is a temporary solution to run migrations on the database. This should be replaced
export const migrateDb = async () => {
  if (!db || !conn) {
    throw new Error("Database not initialized");
  }

  // This will run migrations on the database, skipping the ones already applied
  await migrate(db, {
    migrationsFolder: "./src/server/infrastructure/db/drizzle/migrations",
  })
    .then(() => {
      console.log("Database migrated successfully");
    })
    .catch((error) => {
      console.log("Failed to migrate database", error);
    });
};

void migrateDb();
