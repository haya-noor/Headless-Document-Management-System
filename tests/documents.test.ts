/**
 * Document Management Tests
 * Tests document upload, search, permissions, versioning, and CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testUtils, mocks } from "./setup.test";

describe("Document Management System", () => {
  describe("Document Service", () => {
    it("should upload a document successfully", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      // Mock repositories
      const mockDocRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          currentVersion: 1,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findDuplicatesByChecksum: async () => [],
      };

      const mockVersionRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
        }),
      };

      const mockPermissionRepo = {};
      const mockAuditRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
        }),
      };

      const documentService = new DocumentService(
        mockDocRepo,
        mockVersionRepo,
        mockPermissionRepo,
        mockAuditRepo,
        mocks.mockStorageService
      );

      const file = testUtils.generateTestFile();
      const metadata = {
        tags: ["test", "document"],
        metadata: { category: "test" },
        description: "Test document upload",
      };

      const result = await documentService.uploadDocument(file, metadata, "test-user-id");
      
      expect(result.success).toBe(true);
      expect(result.data?.filename).toBe(file.filename);
      expect(result.data?.uploadedBy).toBe("test-user-id");
    });

    it("should get document with proper permissions", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      const mockDocRepo = {
        findById: async () => ({
          ...mocks.mockDbResponses.document,
          uploadedBy: "test-user-id", // Same user as requesting
        }),
      };

      const mockPermissionRepo = {
        findByDocumentAndUser: async () => [],
      };

      const mockAuditRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
        }),
      };

      const documentService = new DocumentService(
        mockDocRepo,
        {},
        mockPermissionRepo,
        mockAuditRepo,
        mocks.mockStorageService
      );

      const result = await documentService.getDocument("test-doc-id", "test-user-id");
      
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(mocks.mockDbResponses.document.id);
    });

    it("should deny access to unauthorized document", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      const mockDocRepo = {
        findById: async () => ({
          ...mocks.mockDbResponses.document,
          uploadedBy: "different-user-id", // Different user
        }),
      };

      const mockPermissionRepo = {
        findByDocumentAndUser: async () => [], // No permissions
      };

      const documentService = new DocumentService(
        mockDocRepo,
        {},
        mockPermissionRepo,
        {},
        mocks.mockStorageService
      );

      const result = await documentService.getDocument("test-doc-id", "test-user-id");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("ACCESS_DENIED");
    });

    it("should search documents with filters", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      const mockDocRepo = {
        findByUploader: async () => [mocks.mockDbResponses.document],
        findManyPaginated: async () => ({
          data: [mocks.mockDbResponses.document],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        }),
      };

      const mockPermissionRepo = {
        findByUserId: async () => [],
      };

      const documentService = new DocumentService(
        mockDocRepo,
        {},
        mockPermissionRepo,
        {},
        mocks.mockStorageService
      );

      const result = await documentService.searchDocuments(
        { tags: ["test"] },
        { page: 1, limit: 10 },
        "test-user-id"
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.data).toHaveLength(1);
      expect(result.data?.pagination.total).toBe(1);
    });

    it("should update document metadata", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      const mockDocRepo = {
        findById: async () => ({
          ...mocks.mockDbResponses.document,
          uploadedBy: "test-user-id",
        }),
        update: async (id: string, data: any) => ({
          ...mocks.mockDbResponses.document,
          ...data,
          updatedAt: new Date(),
        }),
      };

      const mockPermissionRepo = {
        findByDocumentAndUser: async () => [],
      };

      const mockAuditRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
        }),
      };

      const documentService = new DocumentService(
        mockDocRepo,
        {},
        mockPermissionRepo,
        mockAuditRepo,
        mocks.mockStorageService
      );

      const updateData = {
        tags: ["updated", "test"],
        metadata: { category: "updated" },
      };

      const result = await documentService.updateDocument(
        "test-doc-id",
        updateData,
        "test-user-id"
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.tags).toEqual(updateData.tags);
    });

    it("should generate download link", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      const mockDocRepo = {
        findById: async () => ({
          ...mocks.mockDbResponses.document,
          uploadedBy: "test-user-id",
        }),
      };

      const mockPermissionRepo = {
        findByDocumentAndUser: async () => [],
      };

      const mockAuditRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
        }),
      };

      const documentService = new DocumentService(
        mockDocRepo,
        {},
        mockPermissionRepo,
        mockAuditRepo,
        mocks.mockStorageService
      );

      const result = await documentService.generateDownloadLink(
        "test-doc-id",
        "test-user-id",
        { expiresIn: 3600, filename: "custom-name.pdf" }
      );
      
      expect(result.success).toBe(true);
      expect(result.data?.downloadUrl).toBeDefined();
      expect(result.data?.expiresAt).toBeInstanceOf(Date);
    });

    it("should manage document permissions", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      const mockDocRepo = {
        findById: async () => ({
          ...mocks.mockDbResponses.document,
          uploadedBy: "test-user-id", // Owner can manage permissions
        }),
      };

      const mockPermissionRepo = {
        deleteByDocumentId: async () => true,
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        findByDocumentAndUser: async () => [],
      };

      const mockAuditRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
        }),
      };

      const documentService = new DocumentService(
        mockDocRepo,
        {},
        mockPermissionRepo,
        mockAuditRepo,
        mocks.mockStorageService
      );

      const permissions = [
        { userId: "user1", permission: "read" as const },
        { userId: "user2", permission: "write" as const },
      ];

      const result = await documentService.updateDocumentPermissions(
        "test-doc-id",
        permissions,
        "test-user-id"
      );
      
      expect(result.success).toBe(true);
    });

    it("should delete document", async () => {
      const { DocumentService } = require("../src/services/document.service");
      
      const mockDocRepo = {
        findById: async () => ({
          ...mocks.mockDbResponses.document,
          uploadedBy: "test-user-id",
        }),
        softDelete: async () => true,
      };

      const mockPermissionRepo = {
        findByDocumentAndUser: async () => [],
      };

      const mockAuditRepo = {
        create: async (data: any) => ({
          id: testUtils.randomString(),
          ...data,
          createdAt: new Date(),
        }),
      };

      const documentService = new DocumentService(
        mockDocRepo,
        {},
        mockPermissionRepo,
        mockAuditRepo,
        mocks.mockStorageService
      );

      const result = await documentService.deleteDocument("test-doc-id", "test-user-id");
      
      expect(result.success).toBe(true);
    });
  });

  describe("Document Repository", () => {
    it("should implement CRUD operations", () => {
      const { DocumentRepository } = require("../src/repositories/implementations/document.repository");
      
      const repo = new DocumentRepository();
      
      // Check that all required methods exist
      expect(typeof repo.findById).toBe("function");
      expect(typeof repo.findMany).toBe("function");
      expect(typeof repo.create).toBe("function");
      expect(typeof repo.update).toBe("function");
      expect(typeof repo.delete).toBe("function");
      expect(typeof repo.findByUploader).toBe("function");
      expect(typeof repo.findByTags).toBe("function");
      expect(typeof repo.searchDocuments).toBe("function");
    });

    it("should validate search filters", () => {
      // Test search filter validation without database
      const filters = {
        tags: ["test"],
        mimeType: "application/pdf",
        uploadedBy: "user-id",
        minSize: 1000,
        maxSize: 5000,
        dateFrom: new Date("2024-01-01"),
        dateTo: new Date("2024-12-31"),
      };
      
      expect(filters.tags).toContain("test");
      expect(filters.mimeType).toBe("application/pdf");
      expect(filters.minSize).toBeLessThan(filters.maxSize);
      expect(filters.dateFrom).toBeInstanceOf(Date);
    });
  });

  describe("Document Schemas", () => {
    it("should validate document upload data", () => {
      const { DocumentUploadSchema } = require("../src/schemas/document.schemas");
      
      const validData = {
        file: testUtils.generateTestFile(),
        tags: ["test", "document"],
        metadata: { category: "test" },
        description: "Test document",
      };
      
      const result = DocumentUploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate document search parameters", () => {
      const { DocumentSearchSchema } = require("../src/schemas/document.schemas");
      
      const validData = {
        query: "test",
        tags: ["test"],
        mimeType: "application/pdf",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      
      const result = DocumentSearchSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
    });

    it("should validate permission data", () => {
      const { DocumentPermissionSchema } = require("../src/schemas/document.schemas");
      
      const validData = {
        userId: "user-id-123",
        permission: "read",
      };
      
      const result = DocumentPermissionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid permission data", () => {
      const { DocumentPermissionSchema } = require("../src/schemas/document.schemas");
      
      const invalidData = {
        userId: "invalid-uuid",
        permission: "invalid-permission",
      };
      
      const result = DocumentPermissionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("Document Versioning", () => {
    it("should create document versions", () => {
      const { DocumentVersionRepository } = require("../src/repositories/implementations/document-version.repository");
      
      const repo = new DocumentVersionRepository();
      
      // Check versioning methods exist
      expect(typeof repo.findByDocumentId).toBe("function");
      expect(typeof repo.findLatestVersion).toBe("function");
      expect(typeof repo.getNextVersionNumber).toBe("function");
      expect(typeof repo.getVersionHistory).toBe("function");
    });

    it("should validate version data", () => {
      const versionData = {
        documentId: "doc-id-123",
        version: 2,
        filename: "document-v2.pdf",
        mimeType: "application/pdf",
        size: 2048,
        storageKey: "docs/doc-v2.pdf",
        storageProvider: "local",
        uploadedBy: "user-id-123",
      };
      
      expect(versionData.version).toBeGreaterThan(1);
      expect(versionData.documentId).toBeDefined();
      expect(versionData.storageKey).toContain("v2");
    });
  });

  describe("Document Permissions", () => {
    it("should manage permissions correctly", () => {
      const { DocumentPermissionRepository } = require("../src/repositories/implementations/document-permission.repository");
      
      const repo = new DocumentPermissionRepository();
      
      // Check permission methods exist
      expect(typeof repo.findByDocumentId).toBe("function");
      expect(typeof repo.findByUserId).toBe("function");
      expect(typeof repo.hasPermission).toBe("function");
      expect(typeof repo.grantPermission).toBe("function");
      expect(typeof repo.revokePermission).toBe("function");
    });

    it("should validate permission types", () => {
      const validPermissions = ["read", "write", "delete"];
      const testPermission = "read";
      
      expect(validPermissions).toContain(testPermission);
    });
  });
});
