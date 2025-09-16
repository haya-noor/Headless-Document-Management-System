/**
 * Authentication Tests
 * Tests user registration, login, token management, and authentication flows
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { testUtils, mocks } from "./setup.test";

describe("Authentication System", () => {
  describe("JWT Utilities", () => {
    it("should generate valid JWT tokens", () => {
      const { generateToken, verifyToken } = require("../src/utils/jwt");
      
      const payload = {
        userId: "test-user-123",
        email: "test@example.com",
        role: "user" as const,
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it("should reject invalid tokens", () => {
      const { verifyToken } = require("../src/utils/jwt");
      
      expect(() => verifyToken("invalid-token")).toThrow();
      expect(() => verifyToken("")).toThrow();
    });

    it("should extract tokens from authorization headers", () => {
      const { extractTokenFromHeader } = require("../src/utils/jwt");
      
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
      const authHeader = `Bearer ${token}`;
      
      expect(extractTokenFromHeader(authHeader)).toBe(token);
      expect(extractTokenFromHeader("Invalid header")).toBeNull();
      expect(extractTokenFromHeader("")).toBeNull();
    });
  });

  describe("Password Utilities", () => {
    it("should hash and verify passwords correctly", async () => {
      const { hashPassword, verifyPassword } = require("../src/utils/password");
      
      const password = "TestPassword123!";
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);

      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("WrongPassword", hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it("should validate password strength", () => {
      const { validatePasswordStrength } = require("../src/utils/password");
      
      // Valid passwords
      expect(validatePasswordStrength("TestPass123!")).toBe(true);
      expect(validatePasswordStrength("AnotherValid1@")).toBe(true);
      
      // Invalid passwords
      expect(validatePasswordStrength("short")).toBe(false);
      expect(validatePasswordStrength("nouppercase123!")).toBe(false);
      expect(validatePasswordStrength("NOLOWERCASE123!")).toBe(false);
      expect(validatePasswordStrength("NoNumbers!")).toBe(false);
      expect(validatePasswordStrength("NoSpecialChars123")).toBe(false);
    });
  });

  describe("User Service", () => {
    it("should register a new user", async () => {
      const { UserService } = require("../src/services/user.service");
      
      // Mock repository
      const mockUserRepository = {
        findByEmail: async () => null, // User doesn't exist
        create: async (data: any) => ({
          id: "new-user-id",
          ...data,
          password: "hashed-password",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const userService = new UserService(mockUserRepository);
      const userData = testUtils.generateTestUser();
      
      const result = await userService.register(userData, {});
      
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.token).toBeDefined();
      expect(result.data?.user.email).toBe(userData.email);
    });

    it("should reject registration with duplicate email", async () => {
      const { UserService } = require("../src/services/user.service");
      
      // Mock repository that returns existing user
      const mockUserRepository = {
        findByEmail: async () => mocks.mockDbResponses.user,
        create: async () => { throw new Error("Should not be called"); },
      };

      const userService = new UserService(mockUserRepository);
      const userData = testUtils.generateTestUser();
      
      const result = await userService.register(userData, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("EMAIL_EXISTS");
    });

    it("should login with valid credentials", async () => {
      const { UserService } = require("../src/services/user.service");
      const { hashPassword } = require("../src/utils/password");
      
      const password = "TestPass123!";
      const hashedPassword = await hashPassword(password);
      
      const mockUserRepository = {
        findByEmail: async () => ({
          ...mocks.mockDbResponses.user,
          password: hashedPassword,
        }),
        updateLastLogin: async () => {},
      };

      const userService = new UserService(mockUserRepository);
      
      const result = await userService.login({
        email: "test@example.com",
        password,
      }, {});
      
      expect(result.success).toBe(true);
      expect(result.data?.user).toBeDefined();
      expect(result.data?.token).toBeDefined();
    });

    it("should reject login with invalid credentials", async () => {
      const { UserService } = require("../src/services/user.service");
      
      const mockUserRepository = {
        findByEmail: async () => null, // User not found
      };

      const userService = new UserService(mockUserRepository);
      
      const result = await userService.login({
        email: "nonexistent@example.com",
        password: "TestPass123!",
      }, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("Authentication Schemas", () => {
    it("should validate registration data", () => {
      const { registerSchema } = require("../src/schemas/auth.schemas");
      
      const validData = testUtils.generateTestUser();
      const result = registerSchema.safeParse(validData);
      
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(validData.email);
    });

    it("should reject invalid registration data", () => {
      const { registerSchema } = require("../src/schemas/auth.schemas");
      
      const invalidData = {
        email: "invalid-email",
        password: "weak",
        firstName: "",
        lastName: "",
      };
      
      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.errors.length).toBeGreaterThan(0);
    });

    it("should validate login data", () => {
      const { loginSchema } = require("../src/schemas/auth.schemas");
      
      const validData = {
        email: "test@example.com",
        password: "TestPass123!",
      };
      
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe("Authentication Integration", () => {
  it("should handle complete registration flow", async () => {
    // This would be an integration test with actual HTTP requests
    // For now, we'll test the service layer integration
    
    const userData = testUtils.generateTestUser();
    
    // Mock all dependencies
    const mockRepository = {
      findByEmail: async () => null,
      create: async (data: any) => ({
        id: testUtils.randomString(),
        ...data,
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const { UserService } = require("../src/services/user.service");
    const userService = new UserService(mockRepository);
    
    const result = await userService.register(userData, {});
    
    expect(result.success).toBe(true);
    expect(result.data?.user?.email).toBe(userData.email);
    expect(result.data?.token).toBeDefined();
  });

  it("should handle complete login flow", async () => {
    const { hashPassword } = require("../src/utils/password");
    const password = "TestPass123!";
    const hashedPassword = await hashPassword(password);
    
    const mockRepository = {
      findByEmail: async () => ({
        id: testUtils.randomString(),
        email: "test@example.com",
        password: hashedPassword,
        firstName: "Test",
        lastName: "User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateLastLogin: async () => {},
    };

    const { UserService } = require("../src/services/user.service");
    const userService = new UserService(mockRepository);
    
    const result = await userService.login({
      email: "test@example.com",
      password,
    }, {});
    
    expect(result.success).toBe(true);
    expect(result.data?.token).toBeDefined();
    
    // Verify token is valid
    const { verifyToken } = require("../src/utils/jwt");
    const decoded = verifyToken(result.data!.token);
    expect(decoded.email).toBe("test@example.com");
  });
});
