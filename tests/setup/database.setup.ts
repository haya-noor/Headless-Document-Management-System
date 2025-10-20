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
import { documents, users } from "@/app/infrastructure/database/models/index" 
import { faker } from "@faker-js/faker"

dotenv.config({ path: ".env-test-repo" }) // Load test DB credentials

// Store active connections per test file
const activeConnections = new Map<string, { client: Client; db: ReturnType<typeof drizzle> }>()
let currentTestConnection: { client: Client; db: ReturnType<typeof drizzle> } | null = null

/**
 * Test Database Type
 */
export type TestDatabase = {
  db: ReturnType<typeof drizzle>
  client: Client
  connectionString: string
  cleanup?: () => Promise<void>
}

/**
 * Initializes the Drizzle client using the test DATABASE_URL
 */
export const setupDatabase = async (): Promise<TestDatabase> => {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not defined in .env-test-repo")

  const client = new Client({ connectionString })
  await client.connect()

  const db = drizzle(client)

  // Store the current connection for this test file
  currentTestConnection = { client, db }

  return { db, client, connectionString, cleanup: () => teardownDatabase(client) }
}

/**
 * Gracefully shuts down the test database connection.
 */
export const teardownDatabase = async (clientToClose?: Client) => {
  const client = clientToClose || currentTestConnection?.client
  if (client) {
    await client.end()
    if (client === currentTestConnection?.client) {
      currentTestConnection = null
    }
  }
}

/**
 * Truncates all public tables (use carefully!).
 */
export const truncateAllTables = async (dbInstance?: ReturnType<typeof drizzle>) => {
  const db = dbInstance || currentTestConnection?.db
  if (!db) return
  
  // Truncate specific tables in order to avoid foreign key issues
  await db.execute(sql.raw(`
    TRUNCATE TABLE download_tokens, access_policies, document_versions, documents, users RESTART IDENTITY CASCADE;
  `))
}

/**
 * Returns active Drizzle instance.
 */
export const getDb = () => {
  if (!currentTestConnection?.db) throw new Error("DB not initialized. Did you forget to call setupDatabase()?")
  return currentTestConnection.db
}

/**
 * Clears database state (used in beforeEach)
 */
export const cleanupDatabase = async (dbInstance?: ReturnType<typeof drizzle>) => {
  await truncateAllTables(dbInstance)
}

/**
 * Creates a test document directly in the documents table.
 */
export const createTestDocument = async (
  db: any,
  ownerId: string,
  overrides: Partial<{
    title: string
    currentVersionId: string
    filename: string
    originalName: string
    mimeType: string
    size: number
    storageKey: string
    checksum: string
  }> = {}
) => {
  const id = crypto.randomUUID()
  const filename = overrides.filename ?? faker.system.fileName()
  const originalName = overrides.originalName ?? faker.system.fileName()
  
  const [doc] = await db
    .insert(documents)
    .values({
      id,
      uploadedBy: ownerId,
      filename,
      originalName,
      mimeType: overrides.mimeType ?? 'application/pdf',
      size: overrides.size ?? faker.number.int({ min: 1000, max: 1000000 }),
      storageKey: overrides.storageKey ?? `documents/${id}/${filename}`,
      storageProvider: 'local',
      checksum: overrides.checksum ?? crypto.randomBytes(32).toString('hex'),
      tags: [],
      metadata: {},
      currentVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...(overrides as any),
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
  
  // Generate a valid hashed password (scrypt format)
  const salt = Buffer.from(crypto.randomBytes(16)).toString('base64')
  const hash = Buffer.from(crypto.randomBytes(64)).toString('base64')
  const password = `scrypt:N=16384,r=8,p=1:${salt}:${hash}`

  const [user] = await db
    .insert(users)
    .values({
      id,
      email,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password,
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      ...(overrides as any),
    })
    .returning()

  return user
}

// Aliases to match test imports
export const setupTestDatabase: () => Promise<TestDatabase> = setupDatabase
export const teardownTestDatabase = teardownDatabase
export const cleanupDatabaseAlias = cleanupDatabase // for internal calls
