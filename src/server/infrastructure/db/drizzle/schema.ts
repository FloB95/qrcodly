import {
  mysqlTableCreator,
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

export const qrCodeTable = createTable("qr_code", {
  id: varchar("id", {
    length: 36,
  }).primaryKey(),
  config: json("config").$type<TQRcodeOptions>().notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: datetime("createdAt").notNull(),
  updatedAt: datetime("updatedAt"),
});
