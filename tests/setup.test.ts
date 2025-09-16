/**
 * Test setup configuration for Bun
 * Initializes test environment and shared utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { databaseConfig } from "../src/config/database";

/**
 * Global test setup
 */
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
  process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
  process.env.PORT = "3002"; // Working port
  
  console.log("🧪 Test environment initialized");
});

/**
 * Global test teardown
 */
afterAll(async () => {
  console.log("🧹 Test environment cleaned up");
});

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Generate test user data
   */
  generateTestUser: (overrides: any = {}) => ({
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    password: "TestPass123!",
    firstName: "Test",
    lastName: "User",
    ...overrides,
  }),

  /**
   * Generate test document data
   */
  generateTestDocument: (overrides: any = {}) => ({
    filename: "test-document.pdf",
    originalName: "Test Document.pdf",
    mimeType: "application/pdf",
    size: 1024,
    storageKey: `test/documents/test-doc-${Date.now()}.pdf`,
    storageProvider: "local",
    tags: ["test", "document"],
    metadata: { category: "test", timestamp: Date.now() },
    ...overrides,
  }),

  /**
   * Generate test file upload
   */
  generateTestFile: (overrides: any = {}) => ({
    buffer: Buffer.from("This is a test file content"),
    filename: `test-file-${Date.now()}.txt`,
    mimetype: "text/plain",
    size: 27,
    ...overrides,
  }),

  /**
   * Wait for async operations
   */
  wait: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate random string
   */
  randomString: (length: number = 8) => 
    Math.random().toString(36).substring(2, 2 + length),

  /**
   * Create test JWT token
   */
  createTestToken: (payload: any = {}) => {
    const { generateToken } = require("../src/utils/jwt");
    return generateToken({
      userId: payload.userId || "test-user-id",
      email: payload.email || "test@example.com",
      role: payload.role || "user",
      ...payload,
    });
  },
};

/**
 * Mock implementations for testing
 */
export const mocks = {
  /**
   * Mock storage service
   */
  mockStorageService: {
    uploadFile: async (file: any, key: string) => ({
      key,
      checksum: "mock-checksum-" + Date.now(),
      url: `http://localhost:3002/files/${key}`,
    }),
    
    generateDownloadUrl: async (key: string, expiresIn?: number, filename?: string) => ({
      url: `http://localhost:3002/download/${key}`,
      expiresIn: expiresIn || 3600,
      expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000),
    }),
    
    deleteFile: async (key: string) => true,
    fileExists: async (key: string) => true,
    getFileMetadata: async (key: string) => ({
      size: 1024,
      lastModified: new Date(),
      contentType: "text/plain",
      metadata: {},
    }),
    
    readFile: async (key: string) => Buffer.from("test file content"),
    copyFile: async (source: string, dest: string) => true,
    generateFileKey: (userId: string, filename: string, docId: string) => 
      `${userId}/${docId}/${filename}`,
    generateVersionKey: (baseKey: string, version: number) => 
      `${baseKey}-v${version}`,
  },

  /**
   * Mock database responses
   */
  mockDbResponses: {
    user: {
      id: "test-user-id-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "user",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    
    document: {
      id: "test-doc-id-123",
      filename: "test-document.pdf",
      originalName: "Test Document.pdf",
      mimeType: "application/pdf",
      size: 1024,
      storageKey: "test/documents/test-doc.pdf",
      storageProvider: "local",
      checksum: "mock-checksum",
      tags: ["test"],
      metadata: { category: "test" },
      uploadedBy: "test-user-id-123",
      currentVersion: 1,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
};

export default testUtils;
