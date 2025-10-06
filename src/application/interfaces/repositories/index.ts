/**
 * Repository interfaces index
 * Exports all repository interfaces for easy importing
 */

// Legacy Promise-based interfaces (for backward compatibility)
export * from './base.repository';
export * from './user.repository';
export * from './document.repository';
export * from './document-permission.repository';
export * from './document-version.repository';
export * from './audit-log.repository';

// New Effect-based interfaces (following d4-effect.md requirements)
export * from './effect-base.repository';
export * from './effect-user.repository';
export * from './effect-document.repository';
export * from './access-policy.repository';
