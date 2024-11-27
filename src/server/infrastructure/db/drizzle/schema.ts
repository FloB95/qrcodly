import {
  mysqlTableCreator,
  varchar,
  datetime,
  json,
} from "drizzle-orm/mysql-core";
import { TQrCodeContentOriginalData, TQrCodeContentType, type TQRcodeOptions } from "~/server/domain/types/QRcode";

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
  content_type: varchar("content_type", { length: 255 })
    .$type<TQrCodeContentType>()
    .notNull(),
  original_data: json("original_data")
    .$type<TQrCodeContentOriginalData>()
    .notNull(),
  created_by: varchar("created_by", { length: 255 }),
  created_at: datetime("created_at").notNull(),
  updated_at: datetime("updated_at"),
});
