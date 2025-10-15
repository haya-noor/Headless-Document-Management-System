import { pgTable, varchar, timestamp, uuid } from "drizzle-orm/pg-core"
import { sharedColumns } from "./shared-columns"

export const downloadTokens = pgTable("download_tokens", {
  ...sharedColumns,
  token: varchar("token", { length: 64 }).notNull().unique(),
  documentId: uuid("document_id").notNull(),
  issuedTo: uuid("issued_to").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true })
})

export type DownloadTokenModel = typeof downloadTokens.$inferSelect
