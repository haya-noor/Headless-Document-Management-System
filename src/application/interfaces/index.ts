/**
 * Application Interfaces Index
 * Exports all application layer interfaces
 */

// Domain/Entity interfaces (what the data looks like)
export * from './audit.interface';       // AuditLog entity

// Infrastructure interfaces (cross-cutting concerns)
export * from './auth.interface';        // JWT authentication
export * from './api.interface';         // API responses & pagination
export * from './storage.interface';     // Storage abstraction
export * from './file.interface';        // File upload/download types

// Repository interfaces (data access contracts)
export * from './base.interface';        // Main Repository interface
export * from './user.interface';        // UserRepository interface
export * from './document.interface';    // DocumentRepository interface
export * from './access-policy.interface'; // AccessPolicyRepository interface
