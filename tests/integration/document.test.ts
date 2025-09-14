/**
 * Document management tests
 * Tests document upload, CRUD operations, and file management
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { promises as fs } from 'fs';
import { join } from 'path';
import app from '../test-app';
import { testUtils } from '../setup';
import { LocalStorageService } from '../../src/services/local-storage.service';
import { FileUpload } from '../../src/types';

describe('Document Management System', () => {
  let userToken: string;
  let adminToken: string;
  let storageService: LocalStorageService;

  beforeEach(async () => {
    storageService = new LocalStorageService();
    await testUtils.cleanDatabase();

    // Create test user and admin
    const userData = testUtils.generateTestUser();
    const adminData = testUtils.generateTestUser({ 
      email: 'admin@test.com', 
      role: 'admin' 
    });

    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    userToken = userResponse.body.data.token;

    const adminResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(adminData);
    adminToken = adminResponse.body.data.token;
  });

  afterEach(async () => {
    await testUtils.cleanDatabase();
    // Clean up test storage
    try {
      await fs.rm(join(process.cwd(), 'storage'), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Storage Operations', () => {
    test('should upload file to local storage', async () => {
      const testFile: FileUpload = {
        buffer: Buffer.from('Test document content for storage'),
        originalname: 'test-document.txt',
        mimetype: 'text/plain',
        size: 34,
      };

      const key = storageService.generateFileKey('user-123', 'test-document.txt', 'doc-456');
      const result = await storageService.uploadFile(testFile, key);

      expect(result.key).toBe(key);
      expect(result.checksum).toBeDefined();
      expect(result.url).toContain('localhost:3000');

      // Verify file exists
      const exists = await storageService.fileExists(key);
      expect(exists).toBe(true);
    });

    test('should generate unique file keys', () => {
      const key1 = storageService.generateFileKey('user1', 'document.pdf', 'doc1');
      const key2 = storageService.generateFileKey('user2', 'document.pdf', 'doc2');

      expect(key1).not.toBe(key2);
      expect(key1).toContain('user1');
      expect(key1).toContain('doc1');
      expect(key2).toContain('user2');
      expect(key2).toContain('doc2');
    });

    test('should handle file metadata correctly', async () => {
      const testFile: FileUpload = {
        buffer: Buffer.from('Metadata test content'),
        originalname: 'metadata-test.pdf',
        mimetype: 'application/pdf',
        size: 21,
      };

      const key = 'test/metadata/file.pdf';
      await storageService.uploadFile(testFile, key, {
        metadata: { department: 'IT', category: 'test' },
        tags: { environment: 'test', type: 'document' },
      });

      const metadata = await storageService.getFileMetadata(key);
      expect(metadata.size).toBe(21);
      expect(metadata.contentType).toBe('application/pdf');
    });

    test('should generate version keys correctly', () => {
      const baseKey = 'users/user123/documents/doc456/file.pdf';
      const v1Key = storageService.generateVersionKey(baseKey, 1);
      const v2Key = storageService.generateVersionKey(baseKey, 2);

      expect(v1Key).toContain('versions');
      expect(v1Key).toContain('_v1.pdf');
      expect(v2Key).toContain('_v2.pdf');
      expect(v1Key).not.toBe(v2Key);
    });
  });

  describe('File Serving Endpoints', () => {
    let testFileKey: string;

    beforeEach(async () => {
      // Upload a test file
      const testFile: FileUpload = {
        buffer: Buffer.from('Test file for serving endpoints'),
        originalname: 'serve-test.txt',
        mimetype: 'text/plain',
        size: 32,
      };

      testFileKey = 'test/serve/file.txt';
      await storageService.uploadFile(testFile, testFileKey);
    });

    test('should serve file through API endpoint', async () => {
      const encodedKey = encodeURIComponent(testFileKey);
      
      const response = await request(app)
        .get(`/api/v1/files/${encodedKey}`)
        .expect(200);

      expect(response.text).toBe('Test file for serving endpoints');
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should download file with custom filename', async () => {
      const encodedKey = encodeURIComponent(testFileKey);
      const customFilename = 'my-download.txt';
      
      const response = await request(app)
        .get(`/api/v1/files/download/${encodedKey}?filename=${customFilename}`)
        .expect(200);

      expect(response.text).toBe('Test file for serving endpoints');
      expect(response.headers['content-disposition']).toContain(`filename="${customFilename}"`);
    });

    test('should get file info with authentication', async () => {
      const encodedKey = encodeURIComponent(testFileKey);
      
      const response = await request(app)
        .get(`/api/v1/files/${encodedKey}/info`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe(testFileKey);
      expect(response.body.data.size).toBe(32);
    });

    test('should require admin role for file deletion', async () => {
      const encodedKey = encodeURIComponent(testFileKey);
      
      // Try with regular user token (should fail)
      await request(app)
        .delete(`/api/v1/files/${encodedKey}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Try with admin token (should succeed)
      await request(app)
        .delete(`/api/v1/files/${encodedKey}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Document Placeholder Endpoints', () => {
    test('should return not implemented for document endpoints', async () => {
      // These endpoints are placeholders and should return 501
      const endpoints = [
        '/api/v1/documents',
        '/api/v1/documents/123',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(501);

        expect(response.body.error).toBe('NOT_IMPLEMENTED');
      }
    });
  });

  describe('Storage Statistics', () => {
    test('should return storage statistics', async () => {
      // Upload multiple test files
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

  describe('File Security Tests', () => {
    test('should prevent path traversal attacks', async () => {
      const maliciousKey = '../../../etc/passwd';
      const encodedKey = encodeURIComponent(maliciousKey);
      
      const response = await request(app)
        .get(`/api/v1/files/${encodedKey}`)
        .expect(404);

      expect(response.body.error).toBe('FILE_NOT_FOUND');
    });

    test('should handle large file operations', async () => {
      const largeContent = 'x'.repeat(1024 * 10); // 10KB
      const testFile: FileUpload = {
        buffer: Buffer.from(largeContent),
        originalname: 'large-file.txt',
        mimetype: 'text/plain',
        size: largeContent.length,
      };

      const key = 'test/large/big-file.txt';
      const result = await storageService.uploadFile(testFile, key);

      expect(result.key).toBe(key);
      expect(result.checksum).toBeDefined();

      // Verify file content
      const content = await storageService.readFile(key);
      expect(content.toString()).toBe(largeContent);
    });
  });
});
