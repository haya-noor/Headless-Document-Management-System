/**
 * Utility function tests
 * Tests helper functions and utilities
 */

import { describe, test, expect } from '@jest/globals';
import { generateId, isValidId } from '../src/utils/uuid';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../src/utils/password';
import { generateToken, verifyToken, extractTokenFromHeader, isTokenExpired } from '../src/utils/jwt';
import { UserRole } from '../src/types';

describe('Utility Functions', () => {
  describe('UUID Utils', () => {
    test('should generate valid UUID', () => {
      const id = generateId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(isValidId(id)).toBe(true);
    });

    test('should validate UUID format', () => {
      const validId = '123e4567-e89b-12d3-a456-426614174000';
      const invalidId = 'not-a-uuid';

      expect(isValidId(validId)).toBe(true);
      expect(isValidId(invalidId)).toBe(false);
      expect(isValidId('')).toBe(false);
    });

    test('should generate unique UUIDs', () => {
      const ids = Array.from({ length: 100 }, () => generateId());
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(100); // All should be unique
    });
  });

  describe('Password Utils', () => {
    test('should hash password securely', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });

    test('should verify password correctly', async () => {
      const password = 'VerifyTest123!';
      const hash = await hashPassword(password);

      const isCorrect = await verifyPassword(password, hash);
      const isIncorrect = await verifyPassword('wrongpassword', hash);

      expect(isCorrect).toBe(true);
      expect(isIncorrect).toBe(false);
    });

    test('should validate strong passwords', () => {
      const strongPassword = 'StrongPass123!';
      const result = validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject weak passwords', () => {
      const weakPasswords = [
        '123', // Too short
        'password', // Common weak password
        'PASSWORD123', // No lowercase
        'password123', // No uppercase
        'Password', // No number
        'Password123', // No special character
      ];

      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should provide specific error messages', () => {
      const result = validatePasswordStrength('weak');

      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('JWT Utils', () => {
    const testPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      role: UserRole.USER,
    };

    test('should generate and verify JWT token', () => {
      const token = generateToken(testPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('should extract token from authorization header', () => {
      const token = 'test-token-123';
      const authHeader = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    test('should handle invalid authorization headers', () => {
      const invalidHeaders = [
        '', // Empty
        'Invalid format', // No Bearer
        'Bearer', // No token
        'Basic token', // Wrong type
      ];

      invalidHeaders.forEach(header => {
        const extracted = extractTokenFromHeader(header);
        expect(extracted).toBeNull();
      });
    });

    test('should detect expired tokens', () => {
      // Create token with short expiry
      process.env.JWT_EXPIRES_IN = '1ms';
      const token = generateToken(testPayload);
      
      // Wait for expiration
      setTimeout(() => {
        const isExpired = isTokenExpired(token);
        expect(isExpired).toBe(true);
      }, 10);

      // Reset expiry
      process.env.JWT_EXPIRES_IN = '24h';
    });

    test('should handle invalid tokens gracefully', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
      expect(isTokenExpired('invalid-token')).toBe(true);
    });
  });

  describe('Configuration', () => {
    test('should load configuration correctly', () => {
      const { config } = require('../src/config');

      expect(config.server.port).toBeDefined();
      expect(config.database.url).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(config.storage.provider).toBe('local');
    });

    test('should validate required environment variables', () => {
      const { validateConfig } = require('../src/config');

      // Should not throw with proper config
      expect(() => validateConfig()).not.toThrow();
    });
  });

  describe('Middleware', () => {
    test('should format log messages correctly', () => {
      const { Logger } = require('../src/middleware/logging');

      // Capture console output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      Logger.info('Test message', { key: 'value' });

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

    test('should validate request data with Zod schemas', async () => {
      const { registerSchema } = require('../src/schemas/auth.schemas');

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
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
      expect(() => registerSchema.parse(invalidData)).toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should create custom app errors', () => {
      const { AppError } = require('../src/middleware/error');

      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });

    test('should handle async errors', async () => {
      const { asyncHandler } = require('../src/middleware/error');

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

  describe('Database Connection', () => {
    test('should handle database connection testing', async () => {
      const { databaseConfig } = require('../src/config/database');
      
      // Test connection method exists and returns boolean
      const isConnected = await databaseConfig.testConnection();
      expect(typeof isConnected).toBe('boolean');
    });

    test('should report connection status correctly', () => {
      const { databaseConfig } = require('../src/config/database');
      const isConnected = databaseConfig.isConnected();
      expect(typeof isConnected).toBe('boolean');
    });
  });
});
