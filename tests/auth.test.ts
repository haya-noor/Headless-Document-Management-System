/**
 * Authentication tests
 * Tests user registration, login, and JWT functionality
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from './test-app';
import { testUtils } from './setup';
import { UserService } from '../src/services/user.service';
import { generateToken, verifyToken } from '../src/utils/jwt';
import { hashPassword, verifyPassword } from '../src/utils/password';

describe('Authentication System', () => {
  let userService: UserService;

  beforeEach(async () => {
    userService = new UserService();
    await testUtils.cleanDatabase();
  });

  afterEach(async () => {
    await testUtils.cleanDatabase();
  });

  describe('User Registration', () => {
    test('should register a new user successfully', async () => {
      const userData = testUtils.generateTestUser();

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.role).toBe('user');
      expect(response.body.data.token).toBeDefined();
    });

    test('should reject registration with existing email', async () => {
      const userData = testUtils.generateTestUser({ email: 'existing@example.com' });

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

    test('should reject weak passwords', async () => {
      const userData = testUtils.generateTestUser({ password: 'weak' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Login', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = testUtils.generateTestUser();
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('LOGIN_FAILED');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPass123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('LOGIN_FAILED');
    });
  });

  describe('Protected Routes', () => {
    let token: string;
    let testUser: any;

    beforeEach(async () => {
      testUser = testUtils.generateTestUser();
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);
      token = response.body.data.token;
    });

    test('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
    });

    test('should reject protected route without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('MISSING_AUTH_HEADER');
    });

    test('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('AUTH_FAILED');
    });
  });

  describe('JWT Utilities', () => {
    test('should generate valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as any,
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should verify valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user' as any,
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should reject invalid JWT token', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });
  });

  describe('Password Utilities', () => {
    test('should hash password correctly', async () => {
      const password = 'TestPass123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should verify password correctly', async () => {
      const password = 'TestPass123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});
