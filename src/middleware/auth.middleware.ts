/**
 * Authentication middleware
 * Handles JWT token verification and user authentication
 */

import { verifyToken, verifyTokenWithBlacklist } from '../utils/jwt';
import { TokenBlacklistRepository } from '../repositories/implementations/token-blacklist.repository';

export interface AuthenticatedRequest {
  userId: string;
  email: string;
  [key: string]: any;
}

/**
 * Extract and verify JWT token from request headers
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
      userId: payload.userId,
      email: payload.email,
      ...payload
    };
  } catch (error) {
    return null;
  }
}

/**
 * Verify JWT token with blacklist check and return payload
 */
export async function verifyAuthTokenWithBlacklist(token: string): Promise<AuthenticatedRequest | null> {
  try {
    const tokenBlacklistRepository = new TokenBlacklistRepository();
    const payload = await verifyTokenWithBlacklist(token, (token) => 
      tokenBlacklistRepository.isTokenBlacklisted(token)
    );
    if (!payload) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      ...payload
    };
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware factory
 */
export function createAuthMiddleware() {
  return {
    /**
     * Require authentication for protected routes
     */
    requireAuth: (req: any, res: any, next: any) => {
      const token = extractToken(req.headers);
      if (!token) {
        res.status = 401;
        return {
          success: false,
          message: 'Authorization required',
          error: 'UNAUTHORIZED',
        };
      }

      const payload = verifyAuthToken(token);
      if (!payload) {
        res.status = 401;
        return {
          success: false,
          message: 'Invalid token',
          error: 'INVALID_TOKEN',
        };
      }

      // Attach user info to request
      req.user = payload;
      return next();
    },

    /**
     * Optional authentication for public routes
     */
    optionalAuth: (req: any, res: any, next: any) => {
      const token = extractToken(req.headers);
      if (token) {
        const payload = verifyAuthToken(token);
        if (payload) {
          req.user = payload;
        }
      }
      return next();
    }
  };
}
