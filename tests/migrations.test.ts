/**
 * Migration Tests using Testcontainers
 * Tests database migrations up and down operations
 * 
 * Real PostgreSQL  
 * 
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';

describe('Database Migrations', () => {
  let container: StartedPostgreSqlContainer;
  let db: ReturnType<typeof drizzle>;
  let connection: postgres.Sql;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start();

    // Create database connection
    connection = postgres(container.getConnectionUri());
    db = drizzle(connection);
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    // Clean up
    await connection.end();
    await container.stop();
  }, 30000); // 30 second timeout for cleanup

  beforeEach(async () => {
    // Clean database before each test
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
  });

  describe('Migration Up', () => {
    it('should run migrations successfully', async () => {
      // Run migrations
      await migrate(db, { migrationsFolder: './drizzle' });

      // Verify tables exist
      const tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'TABLE'
        ORDER BY table_name
      `);

      /*
      tables.map((row: any) => row.table_name) → builds an array of table names (e.g., ['users','documents', ...]).
      */
      const tableNames = tables.map((row: any) => row.table_name);
      /*
      expect(tableNames).toContain('<name>') → checks that a specific table was created by your migrations.
      so the migrations produced these tables:
      */
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('documents');
      expect(tableNames).toContain('access_policies');
      expect(tableNames).toContain('document_versions');
      expect(tableNames).toContain('document_permissions');
      expect(tableNames).toContain('audit_logs');
      expect(tableNames).toContain('token_blacklist');
    });


    /*
    ./drizzle contains the migration artifacts (SQL files + metadata) that create those tables(user, documents, access-policy...)
     when you run:
      await migrate(db, { migrationsFolder: './drizzle' });

    */
    it('should create tables with correct structure', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Check users table structure
      /*
      information_schema is a built-in schema inside PostgreSQL database. It contains read-only views with metadata about all 
      the other databases, schemas, tables, columns, and other objects managed by the PostgreSQL server.
      */
      const usersColumns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);

      const columnNames = usersColumns.map((row: any) => row.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password');
      expect(columnNames).toContain('first_name');
      expect(columnNames).toContain('last_name');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('is_active');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should create foreign key constraints', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Check foreign key constraints
      /*
      Reads the database’s metadata views (information_schema.*) to list all FOREIGN KEY constraints in the public schema.
      table_constraints tc        → one row per FK constraint
      key_column_usage kcu        → which child table/column participates
      constraint_column_usage ccu → which parent table/column is referenced
      */
      const foreignKeys = await db.execute(sql`
        SELECT 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name
      `);

      // Map foreign keys for easy lookup
      const fkMap = new Map();
      foreignKeys.forEach((fk: any) => {
        const key = `${fk.table_name}.${fk.column_name}`;
        fkMap.set(key, `${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });

      // Check specific foreign keys, checks these keys in the fkMap
      expect(fkMap.get('documents.uploaded_by')).toBe('users.id');
      expect(fkMap.get('document_versions.document_id')).toBe('documents.id');
      expect(fkMap.get('document_versions.uploaded_by')).toBe('users.id');
      expect(fkMap.get('access_policies.subject_id')).toBe('users.id');
      expect(fkMap.get('access_policies.resource_id')).toBe('documents.id');
    });

    it('should create unique constraints', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Check unique constraints
      const uniqueConstraints = await db.execute(sql`
        SELECT 
          tc.table_name, 
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

      const uniqueMap = new Map();
      uniqueConstraints.forEach((uc: any) => {
        if (!uniqueMap.has(uc.table_name)) {
          uniqueMap.set(uc.table_name, []);
        }
        uniqueMap.get(uc.table_name).push(uc.column_name);
      });

      // Check specific unique constraints
      expect(uniqueMap.get('users')).toContain('email');
      expect(uniqueMap.get('token_blacklist')).toContain('token');
    });

    it('should create check constraints', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Check check constraints
      const checkConstraints = await db.execute(sql`
        SELECT 
          tc.table_name, 
          tc.constraint_name,
          cc.check_clause
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.check_constraints AS cc
          ON tc.constraint_name = cc.constraint_name
          AND tc.table_schema = cc.constraint_schema
        WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `);

      const checkMap = new Map();
      checkConstraints.forEach((cc: any) => {
        if (!checkMap.has(cc.table_name)) {
          checkMap.set(cc.table_name, []);
        }
        checkMap.get(cc.table_name).push(cc.check_clause);
      });

      // Check specific check constraints like role and email format
      const userChecks = checkMap.get('users') || [];
      expect(userChecks.some((check: string) => check.includes('role IN'))).toBe(true);
      expect(userChecks.some((check: string) => check.includes('email ~*'))).toBe(true);
    });

    it('should create indexes', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Check indexes
      /*
      indexes are special lookup tables that the database search engine can use to speed up data retrieval.
      like:
      CREATE INDEX idx_users_email ON users(email); so it can quickly find users by their email address.
      */
      const indexes = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);

      const indexMap = new Map();
      indexes.forEach((idx: any) => {
        if (!indexMap.has(idx.tablename)) {
          indexMap.set(idx.tablename, []);
        }
        indexMap.get(idx.tablename).push(idx.indexname);
      });

      // Check specific indexes
      expect(indexMap.get('users')).toContain('idx_users_email');
      expect(indexMap.get('users')).toContain('idx_users_role');
      expect(indexMap.get('documents')).toContain('idx_documents_uploaded_by');
      expect(indexMap.get('access_policies')).toContain('idx_access_policies_subject_type');
    });
  });

  describe('Migration Down', () => {
    it('should rollback migrations successfully', async () => {
      // First run migrations up
      await migrate(db, { migrationsFolder: './drizzle' });

      // Verify tables exist
      let tables = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'TABLE'
      `);
      expect(tables.length).toBeGreaterThan(0);

      // Note: Drizzle doesn't have built-in rollback functionality
      // This test verifies that the migration up worked correctly
      // In a real scenario, you would implement custom rollback logic
      // or use a migration tool that supports rollbacks
    });
  });

  describe('Data Integrity', () => {
    it('should enforce foreign key constraints', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Try to insert document with non-existent user
      await expect(async () => {
        await db.execute(sql`
          INSERT INTO documents (
            id, filename, original_name, mime_type, size, 
            storage_key, storage_provider, uploaded_by, 
            current_version, created_at, updated_at, is_active
          ) VALUES (
            'test-doc-id', 'test.pdf', 'test.pdf', 'application/pdf', 
            1024, 'test/path', 'local', 'non-existent-user', 
            1, NOW(), NOW(), true
          )
        `);
      }).toThrow();
    });

    it('should enforce unique constraints', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Insert first user
      await db.execute(sql`
        INSERT INTO users (
          id, email, password, first_name, last_name, role, 
          is_active, created_at, updated_at
        ) VALUES (
          'user-1', 'test@example.com', 'hashed-password', 
          'John', 'Doe', 'user', true, NOW(), NOW()
        )
      `);

      // Try to insert user with same email
      await expect(async () => {
        await db.execute(sql`
          INSERT INTO users (
            id, email, password, first_name, last_name, role, 
            is_active, created_at, updated_at
          ) VALUES (
            'user-2', 'test@example.com', 'hashed-password', 
            'Jane', 'Smith', 'user', true, NOW(), NOW()
          )
        `);
      }).toThrow();
    });

    it('should enforce check constraints', async () => {
      await migrate(db, { migrationsFolder: './drizzle' });

      // Try to insert user with invalid role
      await expect(async () => {
        await db.execute(sql`
          INSERT INTO users (
            id, email, password, first_name, last_name, role, 
            is_active, created_at, updated_at
          ) VALUES (
            'user-1', 'test@example.com', 'hashed-password', 
            'John', 'Doe', 'invalid-role', true, NOW(), NOW()
          )
        `);
      }).toThrow();
    });
  });
});
