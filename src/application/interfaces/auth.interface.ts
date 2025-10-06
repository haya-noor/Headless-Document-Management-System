/**
 * Authentication-related interfaces
 */

import { UserRole } from '../types';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated request context for Elysia
 */
export interface AuthenticatedContext {
  user: JWTPayload;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    ip?: string;
  };
}
