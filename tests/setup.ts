/**
 * Test setup configuration
 * Initializes test environment and shared utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { databaseConfig } from '../src/config/database';
import { config } from '../src/config';

/**
 * Global test setup
 * Runs before all tests
 */
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.DATABASE_URL = 'postgresql://dms_user:dms_password@localhost:5432/document_management';
  
  // Connect to test database
  try {
    await databaseConfig.connect();
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
});

/**
 * Global test teardown
 * Runs after all tests
 */
afterAll(async () => {
  // Disconnect from database
  try {
    await databaseConfig.disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Test database disconnection failed:', error);
  }
});

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Generate test user data
   */
  generateTestUser: (overrides: any = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  }),

  /**
   * Generate test document data
   */
  generateTestDocument: (overrides: any = {}) => ({
    filename: 'test-document.pdf',
    originalName: 'Test Document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    storageKey: 'test/documents/test-doc.pdf',
    storageProvider: 'local',
    tags: ['test', 'document'],
    metadata: { category: 'test' },
    ...overrides,
  }),

  /**
   * Clean test data
   */
  cleanDatabase: async () => {
    try {
      const db = databaseConfig.getDatabase();
      const { users, documents, documentPermissions, documentVersions, auditLogs } = await import('../src/models/schema');
      
      // Clean all test data in correct order (respecting foreign keys)
      await db.delete(auditLogs);
      await db.delete(documentPermissions);
      await db.delete(documentVersions);
      await db.delete(documents);
      await db.delete(users);
      
      console.log('🧹 Test data cleaned successfully');
    } catch (error) {
      console.log('ℹ️ Database cleanup skipped (not connected or error)');
    }
  },

  /**
   * Wait for async operations
   */
  wait: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),
};
