/**
 * Integration tests - Full system testing
 * Tests complete workflows with database and storage
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { promises as fs } from 'fs';
import { join } from 'path';
import app from './test-app';
import { databaseConfig } from '../src/config/database';

describe('Integration Tests - Full System', () => {
  let testUserToken: string;
  let adminUserToken: string;
  let testUserId: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Connect to database
    try {
      await databaseConfig.connect();
      console.log('✅ Integration test database connected');
    } catch (error) {
      console.log('ℹ️ Database connection not available for integration tests');
    }
  });

  afterAll(async () => {
    // Clean up and disconnect
    try {
      await databaseConfig.disconnect();
      console.log('✅ Integration test database disconnected');
    } catch (error) {
      console.log('ℹ️ Database cleanup skipped');
    }

    // Clean up storage
    try {
      await fs.rm(join(process.cwd(), 'storage'), { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Create fresh test users for each test
    const timestamp = Date.now();
    
    // Create regular user
    const userData = {
      email: `testuser${timestamp}@example.com`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User',
    };

    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);

    testUserToken = userResponse.body.data.token;
    testUserId = userResponse.body.data.user.id;

    // Create admin user
    const adminData = {
      email: `admin${timestamp}@example.com`,
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    };

    const adminResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(adminData)
      .expect(201);

    adminUserToken = adminResponse.body.data.token;
    adminUserId = adminResponse.body.data.user.id;
  });

  describe('Complete Authentication Workflow', () => {
    test('should complete full user lifecycle', async () => {
      const timestamp = Date.now();
      const email = `lifecycle${timestamp}@example.com`;

      // 1. Register user
      const registerData = {
        email,
        password: 'LifeCycle123!',
        firstName: 'Life',
        lastName: 'Cycle',
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(email);
      const userToken = registerResponse.body.data.token;

      // 2. Login with registered credentials
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'LifeCycle123!' })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.email).toBe(email);

      // 3. Get user profile
      const profileResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(profileResponse.body.data.email).toBe(email);
      expect(profileResponse.body.data.firstName).toBe('Life');

      // 4. Update profile
      const updateResponse = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' })
        .expect(200);

      expect(updateResponse.body.data.firstName).toBe('Updated');
      expect(updateResponse.body.data.lastName).toBe('Name');

      // 5. Change password
      const passwordResponse = await request(app)
        .put('/api/v1/auth/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'LifeCycle123!',
          newPassword: 'NewLifeCycle123!',
          confirmPassword: 'NewLifeCycle123!',
        })
        .expect(200);

      expect(passwordResponse.body.success).toBe(true);

      // 6. Login with new password
      const newLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'NewLifeCycle123!' })
        .expect(200);

      expect(newLoginResponse.body.success).toBe(true);

      // 7. Logout
      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });
  });

  describe('File Storage Integration', () => {
    test('should handle file upload and serving workflow', async () => {
      const { LocalStorageService } = await import('../src/services/local-storage.service');
      const storageService = new LocalStorageService();

      // 1. Upload file
      const testContent = 'Integration test file content';
      const testFile = {
        buffer: Buffer.from(testContent),
        originalname: 'integration-test.txt',
        mimetype: 'text/plain',
        size: testContent.length,
      };

      const fileKey = storageService.generateFileKey(testUserId, 'integration-test.txt', 'doc-123');
      const uploadResult = await storageService.uploadFile(testFile, fileKey);

      expect(uploadResult.key).toBe(fileKey);
      expect(uploadResult.checksum).toBeDefined();

      // 2. Verify file exists
      const exists = await storageService.fileExists(fileKey);
      expect(exists).toBe(true);

      // 3. Get file metadata
      const metadata = await storageService.getFileMetadata(fileKey);
      expect(metadata.size).toBe(testContent.length);
      expect(metadata.contentType).toBe('text/plain');

      // 4. Read file content
      const content = await storageService.readFile(fileKey);
      expect(content.toString()).toBe(testContent);

      // 5. Generate download URL
      const downloadUrl = await storageService.generateDownloadUrl(fileKey);
      expect(downloadUrl.url).toContain('localhost:3000');
      expect(downloadUrl.expiresIn).toBeDefined();

      // 6. Serve file through API
      const encodedKey = encodeURIComponent(fileKey);
      const serveResponse = await request(app)
        .get(`/api/v1/files/${encodedKey}`)
        .expect(200);

      expect(serveResponse.text).toBe(testContent);

      // 7. Get file info through API
      const infoResponse = await request(app)
        .get(`/api/v1/files/${encodedKey}/info`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(infoResponse.body.data.key).toBe(fileKey);
      expect(infoResponse.body.data.size).toBe(testContent.length);

      // 8. Copy file
      const copyKey = fileKey.replace('doc-123', 'doc-copy');
      const copySuccess = await storageService.copyFile(fileKey, copyKey);
      expect(copySuccess).toBe(true);

      // 9. Delete original file
      const deleteSuccess = await storageService.deleteFile(fileKey);
      expect(deleteSuccess).toBe(true);

      // 10. Verify file no longer exists
      const stillExists = await storageService.fileExists(fileKey);
      expect(stillExists).toBe(false);
    });
  });

  describe('Security Integration', () => {
    test('should enforce authentication on protected routes', async () => {
      // Test without token
      await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      // Test with invalid token
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test with valid token
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
    });

    test('should enforce admin role restrictions', async () => {
      const testKey = 'test/admin/file.txt';
      const encodedKey = encodeURIComponent(testKey);

      // Regular user cannot delete files
      await request(app)
        .delete(`/api/v1/files/${encodedKey}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);

      // Admin can delete files (will return 404 for non-existent file)
      await request(app)
        .delete(`/api/v1/files/${encodedKey}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .expect(404); // File doesn't exist, but permission check passed
    });

    test('should validate input data properly', async () => {
      // Invalid registration data
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123',
          firstName: '',
        })
        .expect(400);

      // Invalid login data
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ROUTE_NOT_FOUND');
    });

    test('should handle file not found errors', async () => {
      const nonExistentKey = encodeURIComponent('nonexistent/file.txt');
      
      const response = await request(app)
        .get(`/api/v1/files/${nonExistentKey}`)
        .expect(404);

      expect(response.body.error).toBe('FILE_NOT_FOUND');
    });
  });

  describe('API Documentation Integration', () => {
    test('should serve API documentation', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Headless Document Management System API');
      expect(response.body.data.version).toBe('v1');
      expect(response.body.data.endpoints).toBeDefined();
    });

    test('should serve health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });
  });
});
