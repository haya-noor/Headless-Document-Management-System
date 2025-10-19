/**
 * Database Test Setup (Drizzle + Bun)
 * -----------------------------------------------
 * - Connects to existing Postgres instance using .env-test-repo
 * - Provides Drizzle client + cleanup helpers for integration tests
 */

import { Client } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { sql } from "drizzle-orm"
import dotenv from "dotenv"
import crypto from "crypto"
import { documents, users } from "../../src/app/infrastructure/database/models/index" 
import { faker } from "@faker-js/faker"

dotenv.config({ path: ".env-test-repo" }) // Load test DB credentials

let client: Client | null = null
let db: ReturnType<typeof drizzle> | null = null

/**
 * Initializes the Drizzle client using the test DATABASE_URL
 */
export const setupDatabase = async () => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not defined in .env-test-repo")

  client = new Client({ connectionString })
  await client.connect()

  db = drizzle(client)

  return { db, client, connectionString }
}

/**
 * Gracefully shuts down the test database connection.
 */
export const teardownDatabase = async () => {
  if (client) await client.end()
}

/**
 * Truncates all public tables (use carefully!).
 */
export const truncateAllTables = async () => {
  if (!db) return
  await db.execute(sql.raw(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
      LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `))
}

/**
 * Returns active Drizzle instance.
 */
export const getDb = () => {
  if (!db) throw new Error("DB not initialized. Did you forget to call setupDatabase()?")
  return db
}

/**
 * Clears database state (used in beforeEach)
 */
export const cleanupDatabase = async () => {
  await truncateAllTables()
}

/**
 * Creates a test document directly in the documents table.
 */
export const createTestDocument = async (
  db: any,
  ownerId: string,
  { title, currentVersionId }: { title: string, currentVersionId: string }
) => {
  const id = crypto.randomUUID()

  const [doc] = await db
    .insert(documents)
    .values({
      id,
      ownerId,
      title,
      currentVersionId,
      createdAt: new Date(),
    })
    .returning()

  return doc
}

/**
 * Creates a test user directly in the users table.
 */
export const createTestUser = async (db: any, overrides = {}) => {
  const id = crypto.randomUUID()
  const email = (overrides as any).email ?? faker.internet.email().toLowerCase()

  const [user] = await db
    .insert(users)
    .values({
      id,
      email,
      createdAt: new Date(),
      ...(overrides as any),
    })
    .returning()

  return user
}

// Aliases to match test imports
export const setupTestDatabase = setupDatabase
export const teardownTestDatabase = teardownDatabase
export const cleanupDatabaseAlias = cleanupDatabase // for internal calls
