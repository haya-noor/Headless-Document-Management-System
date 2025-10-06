/**
 * Elysia Authentication Middleware
 * Handles JWT token verification and user authentication for Elysia framework
 */

import { verifyToken } from '../../../utils/jwt';
import { Elysia } from 'elysia';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  [key: string]: any;
}

// ===== CORE JWT FUNCTIONS =====

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(headers: any): string | null {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}

/**
 * Verify JWT token and return payload
 */
export function verifyAuthToken(token: string): AuthenticatedRequest | null {
  try {
    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }
    return {
      ...payload,
      userId: payload.userId,
      email: payload.email
    };
  } catch (error) {
    return null;
  }
}


// ===== ELYSIA AUTHENTICATION HELPERS =====

/**
 * Get authenticated user from headers (Enhanced for Elysia context)
 */
export function getAuthenticatedUser(headers: any): AuthenticatedRequest | null {
  const token = headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}


/**
 * Create authentication middleware for Elysia
 * This adds user context to the request pipeline
 */
export function createElysiaAuthMiddleware() {
  return new Elysia()
    .derive(({ headers }) => {
      const user = getAuthenticatedUser(headers);
      return { user };
    });
}

/**
 * Enhanced authentication response helper
 */
export function createUnauthorizedResponse() {
  return {
    success: false,
    message: 'Unauthorized',
    error: 'UNAUTHORIZED'
  };
}
