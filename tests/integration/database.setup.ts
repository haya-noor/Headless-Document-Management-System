/**
 * Database Test Setup
 * -------------------
 * Initializes Postgres Testcontainer for integration tests.
 * Runs Drizzle migrations and returns a clean connection for each test suite.
 */

import { GenericContainer, StartedTestContainer } from "testcontainers"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Client } from "pg"
import { sql } from "drizzle-orm"

let container: StartedTestContainer | null = null
let client: Client | null = null
let db: ReturnType<typeof drizzle> | null = null

export const setupDatabase = async () => {
  container = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_PASSWORD: "test",
      POSTGRES_USER: "test",
      POSTGRES_DB: "testdb"
    })
    .withExposedPorts(5432)
    .start()

  const port = container!.getMappedPort(5432)
  const host = container!.getHost()
  const connectionString = `postgres://test:test@${host}:${port}/testdb`

  client = new Client({ connectionString })
  await client.connect()

  db = drizzle(client)

  // Run migrations
  await migrate(db, { migrationsFolder: "drizzle" })

  return { db, client, connectionString }
}

export const teardownDatabase = async () => {
  if (client) await client.end()
  if (container) await container.stop()
}

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

export const getDb = () => db!
