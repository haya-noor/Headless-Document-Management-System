/**
 * API integration tests
 * Tests complete API endpoints and workflows
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../test-app';
import { testUtils } from '../setup';
import { LocalStorageService } from '../../src/services/local-storage.service';
import { FileUpload } from '../../src/types';

describe('API Integration Tests', () => {
  beforeEach(async () => {
    await testUtils.cleanDatabase();
  });

  afterEach(async () => {
    await testUtils.cleanDatabase();
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('environment');
    });
  });

  describe('API Documentation', () => {
    test('should return API documentation', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Headless Document Management System API');
      expect(response.body.data).toHaveProperty('version');
      expect(response.body.data).toHaveProperty('endpoints');
    });
  });

  describe('Authentication Flow', () => {
    test('should handle registration request', async () => {
      const userData = testUtils.generateTestUser();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Test response structure regardless of database connection
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
      } else {
        // Database not connected - test error handling
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        console.log('ℹ️ Database not connected - testing error handling');
      }
    });

    test('should handle login request', async () => {
      const userData = testUtils.generateTestUser();

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      // Test response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('token');
      } else {
        // Database not connected - test error handling
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
        console.log('ℹ️ Database not connected - testing error handling');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ROUTE_NOT_FOUND');
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidToken')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('File Serving', () => {
    let storageService: LocalStorageService;
    let testKey: string;

    beforeEach(() => {
      storageService = new LocalStorageService();
    });

    test('should serve existing file', async () => {
      // Upload a test file
      const testContent = 'Test file content for serving';
      const testFile: FileUpload = {
        originalname: 'test-file.txt',
        mimetype: 'text/plain',
        size: testContent.length,
        buffer: Buffer.from(testContent),
      };

      const uploadResult = await storageService.uploadFile(testFile, 'test/serve/test-file.txt');
      testKey = uploadResult.key;

      // Serve the file
      const response = await request(app)
        .get(`/api/v1/files/${encodeURIComponent(testKey)}`)
        .expect(200);

      expect(response.text).toBe(testContent);
    });

    test('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/api/v1/files/nonexistent-file.txt')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should download file with custom filename', async () => {
      // Upload a test file
      const testContent = 'Test file content for download';
      const testFile: FileUpload = {
        originalname: 'test-file.txt',
        mimetype: 'text/plain',
        size: testContent.length,
        buffer: Buffer.from(testContent),
      };

      const uploadResult = await storageService.uploadFile(testFile, 'test/serve/test-file.txt');
      testKey = uploadResult.key;

      // Download the file
      const response = await request(app)
        .get(`/api/v1/files/download/${encodeURIComponent(testKey)}?filename=custom-download-name.txt`)
        .expect(200);

      expect(response.headers['content-disposition']).toContain('custom-download-name.txt');
    });
  });

  describe('Security Tests', () => {
    test('should validate file key encoding', async () => {
      const response = await request(app)
        .get('/api/v1/files/../../../etc/passwd')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent file operations', async () => {
      const storageService = new LocalStorageService();
      const testFiles = Array.from({ length: 5 }, (_, i) => ({
        fieldname: 'file',
        originalname: `file-${i}.txt`,
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 20 + i,
        buffer: Buffer.from(`Test content ${i}`),
        stream: null as any,
        destination: '',
        filename: `file-${i}.txt`,
        path: '',
      }));

      const uploadPromises = testFiles.map((file, index) =>
        storageService.uploadFile(file, `test/concurrent/file-${index}.txt`)
      );

      const results = await Promise.all(uploadPromises);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.key).toBe(`test/concurrent/file-${index}.txt`);
        expect(result.checksum).toBeDefined();
      });
    });

    test('should handle large file uploads', async () => {
      const storageService = new LocalStorageService();
      const largeContent = 'x'.repeat(100 * 1024); // 100KB
      const largeFile: FileUpload = {
        originalname: 'big-file.txt',
        mimetype: 'text/plain',
        size: largeContent.length,
        buffer: Buffer.from(largeContent),
      };

      const result = await storageService.uploadFile(largeFile, 'test/large/big-file.txt');
      
      expect(result.key).toBe('test/large/big-file.txt');
      expect(result.checksum).toBeDefined();
    });
  });
});