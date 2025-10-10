/**
 * Database Setup for Integration Tests
 * Uses Testcontainers to spin up a fresh Postgres database for each test
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

/**
 * Database test configuration
 */
export interface DatabaseTestConfig {
  container: StartedPostgreSqlContainer;
  connection: postgres.Sql;
  db: ReturnType<typeof drizzle>;
}

/**
 * Initialize a fresh database for testing
 * Following d5-effect.md: "Spin up a fresh DB and repository (per test)"
 */
export async function setupTestDatabase(): Promise<DatabaseTestConfig> {
  // Start PostgreSQL container
  const container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('test_document_management')
    .withUsername('test_user')
    .withPassword('test_password')
    .withExposedPorts(5432)
    .start();

  // Create connection
  const connection = postgres({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: 'test_document_management',
    username: 'test_user',
    password: 'test_password',
    max: 1, // Single connection for tests
  });

  // Create Drizzle instance
  const db = drizzle(connection);

  // Run migrations
  await migrate(db, { migrationsFolder: './drizzle' });

  return {
    container,
    connection,
    db,
  };
}

/**
 * Clean up database after tests
 * Following d5-effect.md: "After each test, we clean up the database resources"
 */
export async function cleanupTestDatabase(config: DatabaseTestConfig): Promise<void> {
  try {
    // Close connection
    await config.connection.end();
    
    // Stop container
    await config.container.stop();
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
}

/**
 * Clear all data from database tables
 */
export async function clearDatabaseTables(db: ReturnType<typeof drizzle>): Promise<void> {
  // Disable foreign key checks temporarily
  // tells postgres to temporarily ignore foreign key constraints 
  /*
  because tables are linked (documents -> users, audit_logs -> documents, etc.)
  if we try to delete , postgres will compalin 
  can't delete because of foreign key constraints 
  disabling foreign key checks allows us to delete the tables in any order
  */
  await db.execute(sql`SET session_replication_role = replica;`);
  
  // Clear all tables in correct order (respecting foreign keys)
  await db.execute(sql`TRUNCATE TABLE audit_logs CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE document_permissions CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE access_policies CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE document_versions CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE documents CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE users CASCADE;`);
  
  // Re-enable foreign key 
  /*
  re-enables foreign key checks for the next test
  */
  await db.execute(sql`SET session_replication_role = DEFAULT;`);
}

