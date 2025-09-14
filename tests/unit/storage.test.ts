/**
 * Storage service tests
 * Tests local file storage operations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { LocalStorageService } from '../../src/services/local-storage.service';
import { StorageServiceFactory } from '../../src/services/storage.factory';
import { FileUpload } from '../../src/types';

describe('Storage Service', () => {
  let storageService: LocalStorageService;
  const testStoragePath = join(process.cwd(), 'tests', 'temp-storage');

  beforeEach(async () => {
    storageService = new LocalStorageService();
    
    // Clean up test storage directory
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(testStoragePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Upload', () => {
    test('should upload file successfully', async () => {
      const testFile: FileUpload = {
        buffer: Buffer.from('Test file content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 17,
      };

      const key = 'test/upload/test-file.txt';
      const result = await storageService.uploadFile(testFile, key);

      expect(result.key).toBe(key);
      expect(result.checksum).toBeDefined();
      expect(result.url).toBeDefined();
    });

    test('should create metadata file alongside upload', async () => {
      const testFile: FileUpload = {
        buffer: Buffer.from('Test content'),
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 12,
      };

      const key = 'test/metadata/test-file.txt';
      await storageService.uploadFile(testFile, key, {
        metadata: { category: 'test' },
        tags: { environment: 'test' },
      });

      // Check if metadata file exists
      const storagePath = join(process.cwd(), 'storage', 'documents');
      const metadataPath = join(storagePath, key + '.meta.json');
      
      const exists = await fs.access(metadataPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Check metadata content
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);
      
      expect(metadata.originalName).toBe('test.txt');
      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.category).toBe('test');
    });
  });

  describe('File Operations', () => {
    let testKey: string;

    beforeEach(async () => {
      const testFile: FileUpload = {
        buffer: Buffer.from('Test file for operations'),
        originalname: 'operations-test.txt',
        mimetype: 'text/plain',
        size: 25,
      };

      testKey = 'test/operations/test-file.txt';
      await storageService.uploadFile(testFile, testKey);
    });

    test('should check file existence', async () => {
      const exists = await storageService.fileExists(testKey);
      expect(exists).toBe(true);

      const notExists = await storageService.fileExists('nonexistent/file.txt');
      expect(notExists).toBe(false);
    });

    test('should get file metadata', async () => {
      const metadata = await storageService.getFileMetadata(testKey);

      expect(metadata.size).toBe(24); // Actual file size
      expect(metadata.contentType).toBe('text/plain');
      expect(metadata.lastModified).toBeDefined();
      expect(metadata.lastModified instanceof Date).toBe(true);
    });

    test('should read file content', async () => {
      const content = await storageService.readFile(testKey);
      
      expect(content).toBeInstanceOf(Buffer);
      expect(content.toString()).toBe('Test file for operations');
    });

    test('should generate download URL', async () => {
      const urlResponse = await storageService.generateDownloadUrl(testKey);
      
      expect(urlResponse.url).toBeDefined();
      expect(urlResponse.url).toContain('localhost:3001'); // Test port
      expect(urlResponse.url).toContain(encodeURIComponent(testKey));
      expect(urlResponse.expiresIn).toBeDefined();
    });

    test('should copy file successfully', async () => {
      const destinationKey = 'test/copy/copied-file.txt';
      
      const success = await storageService.copyFile(testKey, destinationKey);
      expect(success).toBe(true);

      // Verify copied file exists
      const exists = await storageService.fileExists(destinationKey);
      expect(exists).toBe(true);

      // Verify content is the same
      const originalContent = await storageService.readFile(testKey);
      const copiedContent = await storageService.readFile(destinationKey);
      expect(originalContent.equals(copiedContent)).toBe(true);
    });

    test('should delete file successfully', async () => {
      const success = await storageService.deleteFile(testKey);
      expect(success).toBe(true);

      // Verify file no longer exists
      const exists = await storageService.fileExists(testKey);
      expect(exists).toBe(false);
    });
  });

  describe('Key Generation', () => {
    test('should generate unique file keys', () => {
      const userId = 'user-123';
      const filename = 'My Document.pdf';
      const documentId = 'doc-456';

      const key = storageService.generateFileKey(userId, filename, documentId);

      expect(key).toContain(userId);
      expect(key).toContain(documentId);
      expect(key).toContain('my_document.pdf'); // Sanitized filename
      expect(key).toMatch(/^users\/[\w-]+\/documents\/[\w-]+\/\d+_[\w.-]+$/);
    });

    test('should generate version-specific keys', () => {
      const baseKey = 'users/user-123/documents/doc-456/file.pdf';
      const version = 2;

      const versionKey = storageService.generateVersionKey(baseKey, version);

      expect(versionKey).toContain('versions');
      expect(versionKey).toContain('_v2.pdf');
      expect(versionKey).toContain('users/user-123/documents/doc-456');
    });
  });

  describe('Storage Factory', () => {
    test('should create local storage service by default', () => {
      const service = StorageServiceFactory.getInstance();
      expect(service).toBeInstanceOf(LocalStorageService);
    });

    test('should throw error for unsupported providers', () => {
      expect(() => {
        StorageServiceFactory.createStorageService({
          provider: 's3' as any,
        });
      }).toThrow('S3 storage not implemented yet');
    });

    test('should reset instance for testing', () => {
      const instance1 = StorageServiceFactory.getInstance();
      StorageServiceFactory.resetInstance();
      const instance2 = StorageServiceFactory.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Storage Statistics', () => {
    test('should return storage statistics', async () => {
      // Upload a few test files
      const files = [
        { key: 'test/stats/file1.txt', content: 'Content 1' },
        { key: 'test/stats/file2.txt', content: 'Content 2' },
        { key: 'test/stats/file3.txt', content: 'Content 3' },
      ];

      for (const file of files) {
        const testFile: FileUpload = {
          buffer: Buffer.from(file.content),
          originalname: file.key.split('/').pop() || 'test.txt',
          mimetype: 'text/plain',
          size: file.content.length,
        };
        await storageService.uploadFile(testFile, file.key);
      }

      const stats = await storageService.getStorageStats();

      expect(stats.totalFiles).toBeGreaterThanOrEqual(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.storageLocation).toBeDefined();
    });
  });
});
