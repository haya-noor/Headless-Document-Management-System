/**
 * Pure unit tests for individual functions
 * Tests functions in isolation without external dependencies
 */

import { describe, test, expect, jest } from '@jest/globals';

// Mock external dependencies for pure unit testing
jest.mock('../../src/config/database', () => ({
  databaseConfig: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(() => false),
    testConnection: jest.fn(() => Promise.resolve(false)),
  },
}));

describe('Unit Tests - Pure Functions', () => {
  describe('UUID Utility Functions', () => {
    test('should generate valid UUID v4', async () => {
      const { generateId, isValidId } = await import('../../src/utils/uuid');
      
      const id = generateId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(isValidId(id)).toBe(true);
    });

    test('should validate UUID format correctly', async () => {
      const { isValidId } = await import('../../src/utils/uuid');
      
      // Valid UUIDs
      expect(isValidId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      
      // Invalid UUIDs
      expect(isValidId('not-a-uuid')).toBe(false);
      expect(isValidId('')).toBe(false);
      expect(isValidId('123')).toBe(false);
      expect(isValidId('123e4567-e29b-41d4-a716')).toBe(false); // Too short
    });

    test('should generate unique UUIDs consistently', async () => {
      const { generateId } = await import('../../src/utils/uuid');
      
      const ids = Array.from({ length: 1000 }, () => generateId());
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(1000); // All should be unique
    });
  });

  describe('Password Utility Functions', () => {
    test('should validate strong passwords', async () => {
      const { validatePasswordStrength } = await import('../../src/utils/password');
      
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Pass1',
      ];

      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    test('should reject weak passwords with specific errors', async () => {
      const { validatePasswordStrength } = await import('../../src/utils/password');
      
      const weakPasswords = [
        { password: 'short', expectedError: 'at least 8 characters' },
        { password: 'nouppercase123!', expectedError: 'uppercase letter' },
        { password: 'NOLOWERCASE123!', expectedError: 'lowercase letter' },
        { password: 'NoNumbers!', expectedError: 'number' },
        { password: 'NoSpecialChars123', expectedError: 'special character' },
        { password: 'password123!', expectedError: 'common weak patterns' },
      ];

      weakPasswords.forEach(({ password, expectedError }) => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(err => err.includes(expectedError))).toBe(true);
      });
    });

    test('should handle edge cases in password validation', async () => {
      const { validatePasswordStrength } = await import('../../src/utils/password');
      
      // Very long password
      const longPassword = 'A'.repeat(200) + '1!';
      const longResult = validatePasswordStrength(longPassword);
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors).toContain('Password must be less than 128 characters long');

      // Empty password
      const emptyResult = validatePasswordStrength('');
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.errors.length).toBeGreaterThan(0);
    });

    test('should hash and verify passwords correctly', async () => {
      const { hashPassword, verifyPassword } = await import('../../src/utils/password');
      
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format

      // Verify correct password
      const isCorrect = await verifyPassword(password, hash);
      expect(isCorrect).toBe(true);

      // Verify incorrect password
      const isIncorrect = await verifyPassword('wrongpassword', hash);
      expect(isIncorrect).toBe(false);
    }, 10000); // Longer timeout for bcrypt
  });

  describe('JWT Utility Functions', () => {
    test('should generate and verify JWT tokens', async () => {
      const { generateToken, verifyToken } = await import('../../src/utils/jwt');
      
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user' as any,
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT structure

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('should extract tokens from authorization headers', async () => {
      const { extractTokenFromHeader } = await import('../../src/utils/jwt');
      
      const token = 'test-token-12345';
      
      // Valid header
      expect(extractTokenFromHeader(`Bearer ${token}`)).toBe(token);
      
      // Invalid headers
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader('Invalid format')).toBeNull();
      expect(extractTokenFromHeader('Bearer')).toBeNull();
      expect(extractTokenFromHeader('Basic token')).toBeNull();
    });

    test('should handle JWT errors gracefully', async () => {
      const { verifyToken, isTokenExpired } = await import('../../src/utils/jwt');
      
      // Invalid token
      expect(() => verifyToken('invalid-token')).toThrow();
      
      // Expired token check
      expect(isTokenExpired('invalid-token')).toBe(true);
      expect(isTokenExpired('')).toBe(true);
    });
  });

  describe('Configuration Functions', () => {
    test('should load configuration with correct structure', async () => {
      // Mock environment variables for testing
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        PORT: '3000',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        JWT_SECRET: 'test-secret',
        STORAGE_PROVIDER: 'local',
      };

      // Clear require cache to reload config
      delete require.cache[require.resolve('../../src/config/index')];
      
      const { config } = await import('../../src/config/index');

      expect(config.server.port).toBe(3001); // Test environment port
      expect(config.server.nodeEnv).toBe('test');
      expect(config.storage.provider).toBe('local');
      expect(config.jwt.secret).toBe('test-jwt-secret-key');
      expect(config.pagination.defaultPageSize).toBe(10);
      expect(config.security.bcryptRounds).toBe(12);

      // Restore original environment
      process.env = originalEnv;
    });

    test('should validate required environment variables', async () => {
      const { validateConfig } = await import('../../src/config/index');
      
      // Should not throw with current environment
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('Validation Schema Functions', () => {
    test('should validate user registration data', async () => {
      const { registerSchema } = await import('../../src/schemas/auth.schemas');

      const validData = {
        email: 'valid@example.com',
        password: 'ValidPass123!',
        firstName: 'Valid',
        lastName: 'User',
      };

      const invalidData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: 'User',
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    test('should validate login data', async () => {
      const { loginSchema } = await import('../../src/schemas/auth.schemas');

      const validLogin = {
        email: 'user@example.com',
        password: 'anypassword',
      };

      const invalidLogin = {
        email: 'invalid-email',
        // missing password
      };

      expect(() => loginSchema.parse(validLogin)).not.toThrow();
      expect(() => loginSchema.parse(invalidLogin)).toThrow();
    });

    test('should validate password change data', async () => {
      const { changePasswordSchema } = await import('../../src/schemas/auth.schemas');

      const validChange = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      };

      const invalidChange = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass123!', // Mismatch
      };

      expect(() => changePasswordSchema.parse(validChange)).not.toThrow();
      expect(() => changePasswordSchema.parse(invalidChange)).toThrow();
    });
  });

  describe('Error Handling Functions', () => {
    test('should create custom application errors', async () => {
      const { AppError } = await import('../../src/middleware/error');

      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    test('should handle async errors with wrapper', async () => {
      const { asyncHandler } = await import('../../src/middleware/error');

      const throwingFunction = async () => {
        throw new Error('Async error');
      };

      const wrappedFunction = asyncHandler(throwingFunction);

      const mockReq = {} as any;
      const mockRes = {} as any;
      const mockNext = jest.fn();

      await wrappedFunction(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Storage Service Functions', () => {
    test('should create storage service factory', async () => {
      const { StorageServiceFactory } = await import('../../src/services/storage.factory');
      
      const service = StorageServiceFactory.getInstance();
      expect(service).toBeDefined();
      
      // Reset and get new instance
      StorageServiceFactory.resetInstance();
      const newService = StorageServiceFactory.getInstance();
      expect(newService).toBeDefined();
      expect(service).not.toBe(newService);
    });

    test('should generate file keys correctly', async () => {
      const { LocalStorageService } = await import('../../src/services/local-storage.service');
      
      const service = new LocalStorageService();
      const key = service.generateFileKey('user-123', 'My Document.pdf', 'doc-456');

      expect(key).toContain('user-123');
      expect(key).toContain('doc-456');
      expect(key).toContain('my_document.pdf'); // Sanitized
      expect(key).toMatch(/users\/[\w-]+\/documents\/[\w-]+\/\d+_[\w.]+/);
    });

    test('should generate version keys correctly', async () => {
      const { LocalStorageService } = await import('../../src/services/local-storage.service');
      
      const service = new LocalStorageService();
      const baseKey = 'users/user123/documents/doc456/file.pdf';
      
      const v1Key = service.generateVersionKey(baseKey, 1);
      const v2Key = service.generateVersionKey(baseKey, 2);

      expect(v1Key).toContain('versions');
      expect(v1Key).toContain('_v1.pdf');
      expect(v2Key).toContain('_v2.pdf');
      expect(v1Key).not.toBe(v2Key);
    });
  });

  describe('Type Definitions', () => {
    test('should have correct enum values', async () => {
      const { UserRole, Permission, AuditAction } = await import('../../src/types');

      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.USER).toBe('user');

      expect(Permission.READ).toBe('read');
      expect(Permission.WRITE).toBe('write');
      expect(Permission.DELETE).toBe('delete');

      expect(AuditAction.UPLOAD).toBe('upload');
      expect(AuditAction.DOWNLOAD).toBe('download');
      expect(AuditAction.UPDATE).toBe('update');
      expect(AuditAction.DELETE).toBe('delete');
    });
  });

  describe('Middleware Functions', () => {
    test('should format log messages correctly', async () => {
      const { Logger } = await import('../../src/middleware/logging');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      Logger.info('Test message', { key: 'value', number: 123 });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"INFO"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test message"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"key":"value"')
      );

      consoleSpy.mockRestore();
    });

    test('should handle different log levels', async () => {
      const { Logger } = await import('../../src/middleware/logging');

      const infoSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      Logger.info('Info message');
      Logger.warn('Warning message');
      Logger.error('Error message');

      expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"INFO"'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"WARN"'));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"ERROR"'));

      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('Validation Middleware Functions', () => {
    test('should create validation middleware', async () => {
      const { validateRequest } = await import('../../src/middleware/validation');
      const { z } = await import('zod');

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const middleware = validateRequest({ body: schema });
      expect(typeof middleware).toBe('function');
    });
  });
});
