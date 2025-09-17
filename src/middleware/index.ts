/**
 * Middleware index
 * Exports all middleware functions
 */

export { 
  createAuthMiddleware, 
  extractToken, 
  verifyAuthToken,
  type AuthenticatedRequest 
} from './auth.middleware';

export { 
  validateBody, 
  validateQuery, 
  validateParams, 
  errorHandler,
  type ValidationError 
} from './validation.middleware';
