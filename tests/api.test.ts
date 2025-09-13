/**
 * API integration tests
 * Tests complete API endpoints and workflows
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from './test-app';
import { testUtils } from './setup';
import { LocalStorageService } from '../src/services/local-storage.service';
import { FileUpload } from '../src/types';

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
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.environment).toBe('test');
    });
  });

  describe('API Documentation', () => {
    test('should return API documentation', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Headless Document Management System API');
      expect(response.body.data.version).toBe('v1');
      expect(response.body.data.endpoints).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    test('should complete full authentication workflow', async () => {
      const userData = testUtils.generateTestUser();

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const { user, token } = registerResponse.body.data;

      // Step 2: Get profile with token
      const profileResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.data.id).toBe(user.id);
      expect(profileResponse.body.data.email).toBe(userData.email);

      // Step 3: Update profile
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updateResponse = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.firstName).toBe('Updated');
      expect(updateResponse.body.data.lastName).toBe('Name');

      // Step 4: Change password
      const passwordData = {
        currentPassword: userData.password,
        newPassword: 'NewTestPass123!',
        confirmPassword: 'NewTestPass123!',
      };

      const passwordResponse = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData)
        .expect(200);

      expect(passwordResponse.body.success).toBe(true);

      // Step 5: Login with new password
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'NewTestPass123!',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();

      // Step 6: Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
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
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_AUTH_HEADER');
    });

    test('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_AUTH_FORMAT');
    });
  });

  describe('File Serving', () => {
    let testKey: string;
    let storageService: LocalStorageService;

    beforeEach(async () => {
      storageService = new LocalStorageService();
      const testFile: FileUpload = {
        buffer: Buffer.from('Test file content for serving'),
        originalname: 'serve-test.txt',
        mimetype: 'text/plain',
        size: 32,
      };

      testKey = 'test/serve/test-file.txt';
      await storageService.uploadFile(testFile, testKey);
    });

    test('should serve existing file', async () => {
      const encodedKey = encodeURIComponent(testKey);
      
      const response = await request(app)
        .get(`/api/v1/files/${encodedKey}`)
        .expect(200);

      expect(response.text).toBe('Test file content for serving');
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should return 404 for non-existent file', async () => {
      const nonExistentKey = encodeURIComponent('nonexistent/file.txt');
      
      const response = await request(app)
        .get(`/api/v1/files/${nonExistentKey}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('FILE_NOT_FOUND');
    });

    test('should download file with custom filename', async () => {
      const encodedKey = encodeURIComponent(testKey);
      const customFilename = 'custom-download-name.txt';
      
      const response = await request(app)
        .get(`/api/v1/files/download/${encodedKey}?filename=${customFilename}`)
        .expect(200);

      expect(response.text).toBe('Test file content for serving');
      expect(response.headers['content-disposition']).toContain(`filename="${customFilename}"`);
    });

    test('should get file information', async () => {
      const userData = testUtils.generateTestUser();
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      
      const token = registerResponse.body.data.token;
      const encodedKey = encodeURIComponent(testKey);
      
      const response = await request(app)
        .get(`/api/v1/files/${encodedKey}/info`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.key).toBe(testKey);
      expect(response.body.data.size).toBe(32);
      expect(response.body.data.contentType).toBe('text/plain');
    });
  });

  describe('Security Tests', () => {
    test('should require admin role for file deletion', async () => {
      // Create regular user
      const userData = testUtils.generateTestUser();
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);
      
      const userToken = registerResponse.body.data.token;
      const testKey = 'test/delete/file.txt';
      
      // Try to delete file as regular user
      const response = await request(app)
        .delete(`/api/v1/files/${encodeURIComponent(testKey)}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should validate file key encoding', async () => {
      const maliciousKey = '../../../etc/passwd';
      const encodedKey = encodeURIComponent(maliciousKey);
      
      const response = await request(app)
        .get(`/api/v1/files/${encodedKey}`)
        .expect(404); // Should not find file outside storage directory

      expect(response.body.error).toBe('FILE_NOT_FOUND');
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent file operations', async () => {
      const operations = [];
      
      for (let i = 0; i < 5; i++) {
        const testFile: FileUpload = {
          buffer: Buffer.from(`Concurrent test file ${i}`),
          originalname: `concurrent-${i}.txt`,
          mimetype: 'text/plain',
          size: 20 + i,
        };

        const key = `test/concurrent/file-${i}.txt`;
        const service = new LocalStorageService();
        operations.push(service.uploadFile(testFile, key));
      }

      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(5);
      results.forEach((result: any, index: number) => {
        expect(result.key).toBe(`test/concurrent/file-${index}.txt`);
        expect(result.checksum).toBeDefined();
      });
    });

    test('should handle large file uploads', async () => {
      const largeContent = 'x'.repeat(1024 * 100); // 100KB
      const testFile: FileUpload = {
        buffer: Buffer.from(largeContent),
        originalname: 'large-file.txt',
        mimetype: 'text/plain',
        size: largeContent.length,
      };

      const key = 'test/large/big-file.txt';
      const service = new LocalStorageService();
      const result = await service.uploadFile(testFile, key);

      expect(result.key).toBe(key);
      expect(result.checksum).toBeDefined();

      // Verify file was stored correctly
      const content = await service.readFile(key);
      expect(content.toString()).toBe(largeContent);
    });
  });
});
