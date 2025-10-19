// drizzle.service.ts
import { drizzle } from "drizzle-orm/node-postgres"
import { Client } from "pg"

let db: ReturnType<typeof drizzle> | null = null

export const databaseService = {
  init(client: Client) {
    db = drizzle(client)
  },
  getDatabase() {
    if (!db) throw new Error("Drizzle DB not initialized")
    return db
  }
}