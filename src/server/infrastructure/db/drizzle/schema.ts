import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  mysqlTableCreator,
  timestamp,
  varchar,
  datetime,
  json,
} from "drizzle-orm/mysql-core";
import { type TQRcodeOptions } from "~/server/domain/types/QRcode";

/**
 * Multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = mysqlTableCreator((name) => `qrcodly_${name}`);

export const posts = createTable(
  "post",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    name: varchar("name", { length: 256 }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
  },
  (example) => ({
    nameIndex: index("name_idx").on(example.name),
  }),
);

export const qrCodeTable = createTable("qr_code", {
  id: varchar("id", {
    length: 36,
  }).primaryKey(),
  config: json("json").$type<TQRcodeOptions>().notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: datetime("createdAt").notNull(),
  updatedAt: datetime("updatedAt"),
});
