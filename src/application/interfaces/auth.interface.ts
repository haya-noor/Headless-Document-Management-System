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

 * this interface is used to store the authenticated user and the request context
 * for example: 
 * {
 *   user: {
 *     userId: string;
 *     email: string;
 *     role: UserRole;
 *   },
 *   request: {
 *     method: string;                    // GET, POST, PUT, DELETE, etc.
 *     url: string;                       // /api/v1/documents
 *     headers: Record<string, string>;   
 *     ip?: string;                       // 127.0.0.1
 *   }
 * }
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
