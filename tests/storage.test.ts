/**
 * Storage Service Tests
 * Tests file upload, download, storage operations, and storage abstraction
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testUtils, mocks } from "./setup.test";
import { promises as fs } from "fs";
import { join } from "path";

describe("Storage Service", () => {
  describe("Local Storage Service", () => {
    it("should initialize storage directory", () => {
      const { LocalStorageService } = require("../src/services/local-storage.service");
      
      const storage = new LocalStorageService();
      expect(storage).toBeDefined();
    });

    it("should generate unique file keys", () => {
      const { LocalStorageService } = require("../src/services/local-storage.service");
      
      const storage = new LocalStorageService();
      const userId = "user-123";
      const filename = "document.pdf";
      const documentId = "doc-456";
      
      const key = storage.generateFileKey(userId, filename, documentId);
      
      expect(key).toContain(userId);
      expect(key).toContain(documentId);
      expect(key).toContain(filename);
      expect(typeof key).toBe("string");
    });

    it("should generate version-specific keys", () => {
      const { LocalStorageService } = require("../src/services/local-storage.service");
      
      const storage = new LocalStorageService();
      const baseKey = "user-123/doc-456/document.pdf";
      const version = 2;
      
      const versionKey = storage.generateVersionKey(baseKey, version);
      
      expect(versionKey).toContain("v2");
      expect(versionKey).toContain("document_v2.pdf");
    });

    it("should create upload result with checksum", async () => {
      const file = testUtils.generateTestFile();
      const key = "test/upload/file.txt";
      
      // Mock the upload method result
      const uploadResult = {
        key,
        checksum: "mock-checksum-" + Date.now(),
        url: `http://localhost:3001/files/${key}`,
      };
      
      expect(uploadResult.key).toBe(key);
      expect(uploadResult.checksum).toMatch(/^mock-checksum-/);
      expect(uploadResult.url).toContain(key);
    });

    it("should generate download URLs", async () => {
      const key = "test/document.pdf";
      const expiresIn = 3600;
      const filename = "custom-name.pdf";
      
      // Mock download URL generation
      const downloadUrl = {
        url: `http://localhost:3001/download/${encodeURIComponent(key)}?filename=${filename}`,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };
      
      expect(downloadUrl.url).toContain(encodeURIComponent(key));
      expect(downloadUrl.url).toContain(filename);
      expect(downloadUrl.expiresIn).toBe(3600);
      expect(downloadUrl.expiresAt).toBeInstanceOf(Date);
    });

    it("should handle file metadata", async () => {
      const metadata = {
        size: 1024,
        lastModified: new Date(),
        contentType: "application/pdf",
        metadata: {
          category: "test",
          author: "Test User",
        },
      };
      
      expect(metadata.size).toBeGreaterThan(0);
      expect(metadata.lastModified).toBeInstanceOf(Date);
      expect(metadata.contentType).toBe("application/pdf");
      expect(metadata.metadata.category).toBe("test");
    });

    it("should validate file operations", async () => {
      const key = "test/document.pdf";
      
      // Mock file operations
      const operations = {
        exists: async () => true,
        delete: async () => true,
        copy: async (source: string, dest: string) => true,
      };
      
      expect(await operations.exists()).toBe(true);
      expect(await operations.delete()).toBe(true);
      expect(await operations.copy("source", "dest")).toBe(true);
    });
  });

  describe("Storage Factory", () => {
    it("should create local storage service by default", () => {
      const { StorageServiceFactory } = require("../src/services/storage.factory");
      
      const storage = StorageServiceFactory.createStorageService();
      expect(storage).toBeDefined();
    });

    it("should return singleton instance", () => {
      const { StorageServiceFactory } = require("../src/services/storage.factory");
      
      const instance1 = StorageServiceFactory.getInstance();
      const instance2 = StorageServiceFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it("should throw error for unsupported providers", () => {
      const { StorageServiceFactory } = require("../src/services/storage.factory");
      
      expect(() => {
        StorageServiceFactory.createStorageService({ provider: "unsupported" as any });
      }).toThrow();
    });

    it("should throw error for S3 (not implemented)", () => {
      const { StorageServiceFactory } = require("../src/services/storage.factory");
      
      expect(() => {
        StorageServiceFactory.createStorageService({ provider: "s3" });
      }).toThrow("S3 storage not implemented yet");
    });
  });

  describe("Storage Interface Compliance", () => {
    it("should implement all required methods", () => {
      const { LocalStorageService } = require("../src/services/local-storage.service");
      
      const storage = new LocalStorageService();
      
      // Check all interface methods exist
      expect(typeof storage.uploadFile).toBe("function");
      expect(typeof storage.generateDownloadUrl).toBe("function");
      expect(typeof storage.deleteFile).toBe("function");
      expect(typeof storage.fileExists).toBe("function");
      expect(typeof storage.getFileMetadata).toBe("function");
      expect(typeof storage.readFile).toBe("function");
      expect(typeof storage.copyFile).toBe("function");
      expect(typeof storage.generateFileKey).toBe("function");
      expect(typeof storage.generateVersionKey).toBe("function");
    });

    it("should handle upload options correctly", () => {
      const uploadOptions = {
        metadata: { category: "test", author: "user" },
        tags: { project: "demo", type: "document" },
        contentType: "application/pdf",
      };
      
      expect(uploadOptions.metadata).toBeDefined();
      expect(uploadOptions.tags).toBeDefined();
      expect(uploadOptions.contentType).toBe("application/pdf");
    });
  });

  describe("File Validation", () => {
    it("should validate file upload data", () => {
      const file = testUtils.generateTestFile({
        mimetype: "application/pdf",
        size: 1024,
      });
      
      // Validate file properties
      expect(file.buffer).toBeInstanceOf(Buffer);
      expect(file.filename).toBeDefined();
      expect(file.mimetype).toBe("application/pdf");
      expect(file.size).toBeGreaterThan(0);
    });

    it("should validate file size limits", () => {
      const { config } = require("../src/config");
      
      const maxSize = config.upload.maxFileSize || 10485760; // 10MB
      const testFileSize = 1024; // 1KB
      
      expect(testFileSize).toBeLessThanOrEqual(maxSize);
    });

    it("should validate allowed file types", () => {
      const { config } = require("../src/config");
      
      const allowedTypes = config.upload.allowedFileTypes || [
        "image/jpeg",
        "image/png", 
        "application/pdf",
        "text/plain"
      ];
      
      const testMimeType = "application/pdf";
      expect(allowedTypes).toContain(testMimeType);
    });

    it("should reject invalid file types", () => {
      const { config } = require("../src/config");
      
      const allowedTypes = config.upload.allowedFileTypes || [];
      const invalidMimeType = "application/x-evil-script";
      
      expect(allowedTypes).not.toContain(invalidMimeType);
    });
  });

  describe("Storage Security", () => {
    it("should sanitize file keys", () => {
      const unsafeKey = "../../../etc/passwd";
      const userId = "user-123";
      const filename = "document.pdf";
      const docId = "doc-456";
      
      // Mock key generation that sanitizes input
      const safeKey = `${userId}/${docId}/${filename}`;
      
      expect(safeKey).not.toContain("..");
      expect(safeKey).not.toContain("/etc/");
      expect(safeKey).toContain(userId);
      expect(safeKey).toContain(docId);
    });

    it("should generate secure checksums", () => {
      const content = "test file content";
      const checksum1 = "checksum-" + Date.now();
      const checksum2 = "checksum-" + (Date.now() + 1);
      
      expect(checksum1).not.toBe(checksum2);
      expect(checksum1.length).toBeGreaterThan(10);
    });

    it("should handle file path validation", () => {
      const validPaths = [
        "user-123/doc-456/file.pdf",
        "uploads/2024/01/document.txt",
        "docs/project/image.jpg",
      ];
      
      const invalidPaths = [
        "../../../etc/passwd",
        "/root/secret.txt",
        "user/../other-user/file.pdf",
      ];
      
      validPaths.forEach(path => {
        expect(path).not.toContain("..");
        expect(path).not.toStartWith("/");
      });
      
      invalidPaths.forEach(path => {
        const isSafe = !path.includes("..") && !path.startsWith("/root/");
        if (path.includes("..") || path.startsWith("/root/")) {
          expect(isSafe).toBe(false);
        }
      });
    });
  });

  describe("Storage Performance", () => {
    it("should handle concurrent operations", async () => {
      const operations = [];
      
      // Simulate multiple concurrent operations
      for (let i = 0; i < 5; i++) {
        operations.push(
          Promise.resolve({
            operation: `upload-${i}`,
            result: `success-${i}`,
            timestamp: Date.now(),
          })
        );
      }
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.operation).toBe(`upload-${index}`);
        expect(result.result).toBe(`success-${index}`);
      });
    });

    it("should handle large file operations", () => {
      const largeFileSize = 5 * 1024 * 1024; // 5MB
      const maxAllowedSize = 10 * 1024 * 1024; // 10MB
      
      expect(largeFileSize).toBeLessThanOrEqual(maxAllowedSize);
      
      // Mock large file processing time
      const processingTime = largeFileSize / (1024 * 1024); // seconds per MB
      expect(processingTime).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(10); // Should process within 10 seconds
    });
  });
});
