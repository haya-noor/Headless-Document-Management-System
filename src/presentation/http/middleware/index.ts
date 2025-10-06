/**
 * Middleware index
 * Exports all middleware functions
 */

export { 
  extractToken, 
  verifyAuthToken,
  getAuthenticatedUser,
  createElysiaAuthMiddleware,
  createUnauthorizedResponse,
  type AuthenticatedRequest 
} from './auth.middleware';

export { 
  Logger,
  AuditLogger,
  logRequest,
  logResponse
} from './logging';
