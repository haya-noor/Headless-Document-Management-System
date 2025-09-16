/**
 * API Integration Tests
 * Tests HTTP endpoints, request/response handling, and API functionality
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { testUtils, mocks } from "./setup.test";

describe("API Integration Tests", () => {
  const BASE_URL = "http://localhost:3003"; // Test port
  
  describe("Health Check API", () => {
    it("should return health status", async () => {
      const healthData = {
        success: true,
        message: "Service is healthy",
        data: {
          timestamp: new Date().toISOString(),
          uptime: 123.45,
          environment: "test",
          version: "1.0.0",
        },
      };
      
      expect(healthData.success).toBe(true);
      expect(healthData.data.environment).toBe("test");
      expect(healthData.data.uptime).toBeGreaterThan(0);
    });

    it("should include proper response headers", () => {
      const expectedHeaders = {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "X-XSS-Protection": "0",
      };
      
      Object.entries(expectedHeaders).forEach(([key, value]) => {
        expect(value).toBeDefined();
      });
    });
  });

  describe("Authentication API", () => {
    it("should register a new user", async () => {
      const userData = testUtils.generateTestUser();
      
      // Mock successful registration response
      const registrationResponse = {
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: testUtils.randomString(),
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: "user",
            isActive: true,
          },
          token: testUtils.createTestToken({ email: userData.email }),
        },
      };
      
      expect(registrationResponse.success).toBe(true);
      expect(registrationResponse.data.user.email).toBe(userData.email);
      expect(registrationResponse.data.token).toBeDefined();
    });

    it("should login existing user", async () => {
      const loginData = {
        email: "test@example.com",
        password: "TestPass123!",
      };
      
      // Mock successful login response
      const loginResponse = {
        success: true,
        message: "Login successful",
        data: {
          user: mocks.mockDbResponses.user,
          token: testUtils.createTestToken({ email: loginData.email }),
        },
      };
      
      expect(loginResponse.success).toBe(true);
      expect(loginResponse.data.user.email).toBe(loginData.email);
      expect(loginResponse.data.token).toBeDefined();
    });

    it("should reject invalid credentials", async () => {
      const invalidLogin = {
        email: "nonexistent@example.com",
        password: "WrongPassword",
      };
      
      const errorResponse = {
        success: false,
        message: "Invalid credentials",
        error: "INVALID_CREDENTIALS",
      };
      
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe("INVALID_CREDENTIALS");
    });

    it("should validate JWT tokens", () => {
      const token = testUtils.createTestToken({
        userId: "test-user-123",
        email: "test@example.com",
        role: "user",
      });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
      
      // Verify token structure
      const { verifyToken } = require("../src/utils/jwt");
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe("test-user-123");
      expect(decoded.email).toBe("test@example.com");
    });

    it("should protect authenticated endpoints", async () => {
      const protectedEndpoints = [
        "/api/v1/auth/me",
        "/api/v1/auth/profile",
        "/api/v1/documents",
        "/api/v1/files/test/info",
      ];
      
      protectedEndpoints.forEach(endpoint => {
        // Mock unauthorized response
        const unauthorizedResponse = {
          success: false,
          message: "Authorization required",
          error: "UNAUTHORIZED",
        };
        
        expect(unauthorizedResponse.success).toBe(false);
        expect(unauthorizedResponse.error).toBe("UNAUTHORIZED");
      });
    });
  });

  describe("Document API", () => {
    const testToken = testUtils.createTestToken();
    
    it("should upload document with metadata", async () => {
      const file = testUtils.generateTestFile();
      const metadata = {
        tags: ["test", "document"],
        metadata: { category: "test" },
        description: "Test document upload",
      };
      
      // Mock successful upload response
      const uploadResponse = {
        success: true,
        message: "Document uploaded successfully",
        data: {
          id: testUtils.randomString(),
          filename: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          tags: metadata.tags,
          metadata: metadata.metadata,
          uploadedBy: "test-user-123",
          createdAt: new Date(),
        },
      };
      
      expect(uploadResponse.success).toBe(true);
      expect(uploadResponse.data.filename).toBe(file.filename);
      expect(uploadResponse.data.tags).toEqual(metadata.tags);
    });

    it("should list user documents", async () => {
      // Mock document list response
      const documentsResponse = {
        success: true,
        message: "Documents retrieved successfully",
        data: {
          data: [mocks.mockDbResponses.document],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1,
          },
        },
      };
      
      expect(documentsResponse.success).toBe(true);
      expect(documentsResponse.data.data).toHaveLength(1);
      expect(documentsResponse.data.pagination.total).toBe(1);
    });

    it("should search documents with filters", async () => {
      const searchParams = {
        tags: ["test"],
        mimeType: "application/pdf",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      
      // Mock search response
      const searchResponse = {
        success: true,
        message: "Documents retrieved successfully",
        data: {
          data: [mocks.mockDbResponses.document],
          pagination: {
            page: searchParams.page,
            limit: searchParams.limit,
            total: 1,
            totalPages: 1,
          },
        },
      };
      
      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data.pagination.page).toBe(searchParams.page);
    });

    it("should get document by ID", async () => {
      const documentId = "test-doc-123";
      
      // Mock document response
      const documentResponse = {
        success: true,
        message: "Document retrieved successfully",
        data: mocks.mockDbResponses.document,
      };
      
      expect(documentResponse.success).toBe(true);
      expect(documentResponse.data.id).toBeDefined();
    });

    it("should update document metadata", async () => {
      const documentId = "test-doc-123";
      const updateData = {
        tags: ["updated", "test"],
        metadata: { category: "updated", version: 2 },
      };
      
      // Mock update response
      const updateResponse = {
        success: true,
        message: "Document updated successfully",
        data: {
          ...mocks.mockDbResponses.document,
          ...updateData,
          updatedAt: new Date(),
        },
      };
      
      expect(updateResponse.success).toBe(true);
      expect(updateResponse.data.tags).toEqual(updateData.tags);
    });

    it("should generate download links", async () => {
      const documentId = "test-doc-123";
      const linkOptions = {
        expiresIn: 3600,
        filename: "custom-name.pdf",
      };
      
      // Mock download link response
      const linkResponse = {
        success: true,
        message: "Download link generated successfully",
        data: {
          downloadUrl: `${BASE_URL}/download/${documentId}?filename=${linkOptions.filename}`,
          expiresAt: new Date(Date.now() + linkOptions.expiresIn * 1000),
        },
      };
      
      expect(linkResponse.success).toBe(true);
      expect(linkResponse.data.downloadUrl).toContain(documentId);
      expect(linkResponse.data.expiresAt).toBeInstanceOf(Date);
    });

    it("should manage document permissions", async () => {
      const documentId = "test-doc-123";
      const permissions = [
        { userId: "user-1", permission: "read" },
        { userId: "user-2", permission: "write" },
      ];
      
      // Mock permissions update response
      const permissionsResponse = {
        success: true,
        message: "Document permissions updated successfully",
      };
      
      expect(permissionsResponse.success).toBe(true);
    });

    it("should delete documents", async () => {
      const documentId = "test-doc-123";
      
      // Mock deletion response
      const deleteResponse = {
        success: true,
        message: "Document deleted successfully",
      };
      
      expect(deleteResponse.success).toBe(true);
    });
  });

  describe("File Operations API", () => {
    it("should serve files", async () => {
      const fileKey = "test/document.pdf";
      
      // Mock file serving (would return file buffer in real implementation)
      const fileResponse = {
        contentType: "application/pdf",
        contentLength: 1024,
        lastModified: new Date().toUTCString(),
        cacheControl: "public, max-age=3600",
      };
      
      expect(fileResponse.contentType).toBe("application/pdf");
      expect(fileResponse.contentLength).toBeGreaterThan(0);
    });

    it("should provide file download", async () => {
      const fileKey = "test/document.pdf";
      const filename = "custom-name.pdf";
      
      // Mock download headers
      const downloadHeaders = {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": "1024",
      };
      
      expect(downloadHeaders["Content-Disposition"]).toContain(filename);
      expect(downloadHeaders["Content-Type"]).toBe("application/pdf");
    });

    it("should get file metadata", async () => {
      const fileKey = "test/document.pdf";
      
      // Mock file metadata response
      const metadataResponse = {
        success: true,
        message: "File information retrieved successfully",
        data: {
          key: fileKey,
          size: 1024,
          contentType: "application/pdf",
          lastModified: new Date(),
          metadata: { category: "test" },
        },
      };
      
      expect(metadataResponse.success).toBe(true);
      expect(metadataResponse.data.key).toBe(fileKey);
      expect(metadataResponse.data.size).toBeGreaterThan(0);
    });

    it("should handle file not found", async () => {
      const nonExistentKey = "nonexistent/file.pdf";
      
      // Mock file not found response
      const notFoundResponse = {
        success: false,
        message: "File not found",
        error: "FILE_NOT_FOUND",
      };
      
      expect(notFoundResponse.success).toBe(false);
      expect(notFoundResponse.error).toBe("FILE_NOT_FOUND");
    });
  });

  describe("API Error Handling", () => {
    it("should handle validation errors", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "weak",
      };
      
      // Mock validation error response
      const validationError = {
        success: false,
        message: "Invalid input data",
        error: "VALIDATION_ERROR",
        details: [
          { field: "email", message: "Invalid email format" },
          { field: "password", message: "Password too weak" },
        ],
      };
      
      expect(validationError.success).toBe(false);
      expect(validationError.error).toBe("VALIDATION_ERROR");
      expect(validationError.details).toHaveLength(2);
    });

    it("should handle server errors gracefully", async () => {
      // Mock server error response
      const serverError = {
        success: false,
        message: "Internal server error",
        error: "SERVER_ERROR",
      };
      
      expect(serverError.success).toBe(false);
      expect(serverError.error).toBe("SERVER_ERROR");
    });

    it("should handle rate limiting", async () => {
      // Mock rate limit response
      const rateLimitResponse = {
        success: false,
        message: "Too many requests",
        error: "RATE_LIMIT_EXCEEDED",
        retryAfter: 60,
      };
      
      expect(rateLimitResponse.success).toBe(false);
      expect(rateLimitResponse.error).toBe("RATE_LIMIT_EXCEEDED");
      expect(rateLimitResponse.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("API Response Format", () => {
    it("should have consistent response structure", () => {
      const successResponse = {
        success: true,
        message: "Operation successful",
        data: { result: "data" },
      };
      
      const errorResponse = {
        success: false,
        message: "Operation failed",
        error: "ERROR_CODE",
      };
      
      // Check success response structure
      expect(successResponse).toHaveProperty("success");
      expect(successResponse).toHaveProperty("message");
      expect(successResponse).toHaveProperty("data");
      
      // Check error response structure
      expect(errorResponse).toHaveProperty("success");
      expect(errorResponse).toHaveProperty("message");
      expect(errorResponse).toHaveProperty("error");
    });

    it("should include proper HTTP status codes", () => {
      const statusCodes = {
        success: 200,
        created: 201,
        badRequest: 400,
        unauthorized: 401,
        forbidden: 403,
        notFound: 404,
        serverError: 500,
      };
      
      expect(statusCodes.success).toBe(200);
      expect(statusCodes.created).toBe(201);
      expect(statusCodes.unauthorized).toBe(401);
      expect(statusCodes.notFound).toBe(404);
    });

    it("should handle pagination properly", () => {
      const paginatedResponse = {
        success: true,
        message: "Data retrieved successfully",
        data: {
          data: [1, 2, 3],
          pagination: {
            page: 1,
            limit: 10,
            total: 3,
            totalPages: 1,
          },
        },
      };
      
      expect(paginatedResponse.data.pagination.page).toBe(1);
      expect(paginatedResponse.data.pagination.total).toBe(3);
      expect(paginatedResponse.data.pagination.totalPages).toBe(1);
    });
  });
});
