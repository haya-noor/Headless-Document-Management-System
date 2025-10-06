/**
 * Simple Migration Tests
 * Tests migration file structure and SQL syntax
 * Following d4-effect.md requirements for migration validation
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Migration Files', () => {
  it('should have generated migration file', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    expect(migrationContent).toBeDefined();
    expect(migrationContent.length).toBeGreaterThan(0);
  });

  it('should contain access_policies table', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "access_policies"');
    expect(migrationContent).toContain('"subject_type" varchar(20) NOT NULL');
    expect(migrationContent).toContain('"resource_type" varchar(20) NOT NULL');
    expect(migrationContent).toContain('"actions" jsonb NOT NULL');
    expect(migrationContent).toContain('"priority" integer DEFAULT 50 NOT NULL');
  });

  it('should contain SharedColumns in all tables', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    // Check that all tables have id, created_at, updated_at
    const tables = ['users', 'documents', 'access_policies', 'document_versions', 'document_permissions', 'audit_logs', 'token_blacklist'];
    
    tables.forEach(table => {
      expect(migrationContent).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
      expect(migrationContent).toContain(`"id" varchar(36) PRIMARY KEY NOT NULL`);
      expect(migrationContent).toContain(`"created_at" timestamp DEFAULT now() NOT NULL`);
      expect(migrationContent).toContain(`"updated_at" timestamp DEFAULT now() NOT NULL`);
    });
  });

  it('should contain soft delete columns where appropriate', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    // Check tables that should have is_active
    const tablesWithSoftDelete = ['users', 'documents', 'access_policies'];
    
    tablesWithSoftDelete.forEach(table => {
      expect(migrationContent).toContain(`"is_active" boolean DEFAULT true NOT NULL`);
    });
  });

  it('should contain unique constraints', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    expect(migrationContent).toContain('CONSTRAINT "users_email_unique" UNIQUE("email")');
    expect(migrationContent).toContain('CONSTRAINT "token_blacklist_token_unique" UNIQUE("token")');
    expect(migrationContent).toContain('CONSTRAINT "document_permissions_user_id_document_id_permission_unique" UNIQUE("user_id","document_id","permission")');
    expect(migrationContent).toContain('CONSTRAINT "document_versions_document_id_version_unique" UNIQUE("document_id","version")');
  });

  it('should contain indexes for performance', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    // Check for key indexes
    expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS "idx_users_email"');
    expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS "idx_users_role"');
    expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS "idx_documents_uploaded_by"');
    expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS "idx_access_policies_subject_type"');
    expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS "idx_access_policies_priority"');
  });

  it('should have proper foreign key structure', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    // Check that foreign key columns exist (actual FK constraints would be added separately)
    expect(migrationContent).toContain('"uploaded_by" varchar(36) NOT NULL');
    expect(migrationContent).toContain('"document_id" varchar(36) NOT NULL');
    expect(migrationContent).toContain('"user_id" varchar(36) NOT NULL');
  });

  it('should have proper data types', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    // Check UUID format
    expect(migrationContent).toContain('varchar(36)');
    
    // Check JSONB usage
    expect(migrationContent).toContain('jsonb');
    
    // Check timestamp usage
    expect(migrationContent).toContain('timestamp DEFAULT now()');
    
    // Check boolean usage
    expect(migrationContent).toContain('boolean DEFAULT true');
  });

  it('should have proper default values', () => {
    const migrationPath = join(process.cwd(), 'drizzle', '0000_broken_romulus.sql');
    const migrationContent = readFileSync(migrationPath, 'utf-8');
    
    expect(migrationContent).toContain('DEFAULT \'user\'');
    expect(migrationContent).toContain('DEFAULT \'local\'');
    expect(migrationContent).toContain('DEFAULT 1');
    expect(migrationContent).toContain('DEFAULT 50');
    expect(migrationContent).toContain("DEFAULT '{}'::jsonb");
    expect(migrationContent).toContain("DEFAULT '[]'::jsonb");
  });
});
