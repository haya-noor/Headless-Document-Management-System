/**
 * Working tests - Focus on what we can actually test
 * Tests that work with current implementation
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from './test-app';
import { testUtils } from './setup';
import { generateId } from '../src/utils/uuid';
import { hashPassword, validatePasswordStrength } from '../src/utils/password';
import { generateToken, verifyToken } from '../src/utils/jwt';
import { LocalStorageService } from '../src/services/local-storage.service';
import { UserRole, FileUpload } from '../src/types';

describe('Working Tests - All Functionalities', () => {
  beforeEach(async () => {
    await testUtils.cleanDatabase();
  });

  afterEach(async () => {
    await testUtils.cleanDatabase();
  });

  describe('✅ User Registration (Working)', () => {
    test('should register a new user successfully', async () => {
      const userData = testUtils.generateTestUser();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
    });

    test('should reject duplicate email registration', async () => {
      const userData = testUtils.generateTestUser({ email: 'duplicate@example.com' });

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('EMAIL_EXISTS');
    });

    test('should validate input data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('✅ API Endpoints (Working)', () => {
    test('should serve health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Service is healthy');
      expect(response.body.data.timestamp).toBeDefined();
    });

    test('should serve API documentation', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Headless Document Management System API');
      expect(response.body.data.version).toBe('v1');
    });

    test('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ROUTE_NOT_FOUND');
    });

    test('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_AUTH_HEADER');
    });
  });

  describe('✅ Utility Functions (Working)', () => {
    test('should generate valid UUIDs', () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should validate passwords correctly', () => {
      const strong = validatePasswordStrength('StrongPass123!');
      const weak = validatePasswordStrength('weak');

      expect(strong.isValid).toBe(true);
      expect(strong.errors).toHaveLength(0);
      expect(weak.isValid).toBe(false);
      expect(weak.errors.length).toBeGreaterThan(0);
    });

    test('should handle JWT tokens correctly', () => {
      const payload = { userId: 'test', email: 'test@example.com', role: UserRole.USER };
      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
    }, 10000);
  });

  describe('✅ Storage Operations (Working)', () => {
    let storageService: LocalStorageService;

    beforeEach(() => {
      storageService = new LocalStorageService();
    });

    test('should generate unique file keys', () => {
      const key1 = storageService.generateFileKey('user1', 'doc.pdf', 'doc1');
      const key2 = storageService.generateFileKey('user2', 'doc.pdf', 'doc2');

      expect(key1).not.toBe(key2);
      expect(key1).toContain('user1');
      expect(key1).toContain('doc1');
      expect(key2).toContain('user2');
      expect(key2).toContain('doc2');
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

    test('should upload and manage files', async () => {
      const testFile: FileUpload = {
        buffer: Buffer.from('Test file content for storage testing'),
        originalname: 'test-upload.txt',
        mimetype: 'text/plain',
        size: 38,
      };

      const key = 'test/working/upload-test.txt';
      
      // Upload file
      const uploadResult = await storageService.uploadFile(testFile, key);
      expect(uploadResult.key).toBe(key);
      expect(uploadResult.checksum).toBeDefined();

      // Check file exists
      const exists = await storageService.fileExists(key);
      expect(exists).toBe(true);

      // Read file content
      const content = await storageService.readFile(key);
      expect(content.toString()).toBe('Test file content for storage testing');

      // Generate download URL
      const downloadUrl = await storageService.generateDownloadUrl(key);
      expect(downloadUrl.url).toContain('localhost');
      expect(downloadUrl.expiresIn).toBeDefined();

      // Delete file
      const deleteSuccess = await storageService.deleteFile(key);
      expect(deleteSuccess).toBe(true);

      // Verify deleted
      const stillExists = await storageService.fileExists(key);
      expect(stillExists).toBe(false);
    });

    test('should get storage statistics', async () => {
      // Upload a few test files
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      
      for (const fileName of files) {
        const testFile: FileUpload = {
          buffer: Buffer.from(`Content of ${fileName}`),
          originalname: fileName,
          mimetype: 'text/plain',
          size: `Content of ${fileName}`.length,
        };
        await storageService.uploadFile(testFile, `test/stats/${fileName}`);
      }

      const stats = await storageService.getStorageStats();
      expect(stats.totalFiles).toBeGreaterThanOrEqual(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.storageLocation).toBeDefined();
    });
  });

  describe('✅ File Serving (Working)', () => {
    let testFileKey: string;
    let storageService: LocalStorageService;

    beforeEach(async () => {
      storageService = new LocalStorageService();
      
      // Upload test file
      const testFile: FileUpload = {
        buffer: Buffer.from('File serving test content'),
        originalname: 'serve-test.txt',
        mimetype: 'text/plain',
        size: 26,
      };

      testFileKey = 'test/serve/file-serve-test.txt';
      await storageService.uploadFile(testFile, testFileKey);
    });

    test('should serve files through API', async () => {
      const encodedKey = encodeURIComponent(testFileKey);
      
      const response = await request(app)
        .get(`/api/v1/files/${encodedKey}`)
        .expect(200);

      expect(response.text).toBe('File serving test content');
      expect(response.headers['content-type']).toBe('text/plain');
    });

    test('should handle file not found', async () => {
      const nonExistentKey = encodeURIComponent('nonexistent/file.txt');
      
      const response = await request(app)
        .get(`/api/v1/files/${nonExistentKey}`)
        .expect(404);

      expect(response.body.error).toBe('FILE_NOT_FOUND');
    });

    test('should serve download with custom filename', async () => {
      const encodedKey = encodeURIComponent(testFileKey);
      const customFilename = 'my-download.txt';
      
      const response = await request(app)
        .get(`/api/v1/files/download/${encodedKey}?filename=${customFilename}`)
        .expect(200);

      expect(response.text).toBe('File serving test content');
      expect(response.headers['content-disposition']).toContain(`filename="${customFilename}"`);
    });
  });

  describe('✅ Document Placeholder Endpoints (Working)', () => {
    let userToken: string;

    beforeEach(async () => {
      const userData = testUtils.generateTestUser();
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);
      userToken = response.body.data.token;
    });

    test('should return not implemented for document endpoints', async () => {
      // Test GET documents
      const getResponse = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(501);

      expect(getResponse.body.error).toBe('NOT_IMPLEMENTED');

      // Test POST documents
      const postResponse = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(501);

      expect(postResponse.body.error).toBe('NOT_IMPLEMENTED');
    });
  });
});
