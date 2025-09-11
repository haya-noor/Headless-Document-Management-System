/**
 * Authentication middleware for Express.js
 * Handles JWT token validation and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole, ApiResponse } from '../types';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

/**
 * Authentication middleware
 * Validates JWT token and attaches user information to request
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      const response: ApiResponse = {
        success: false,
        message: 'Authorization header is required',
        error: 'MISSING_AUTH_HEADER',
      };
      res.status(401).json(response);
      return;
    }

    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Invalid authorization header format. Use: Bearer <token>',
        error: 'INVALID_AUTH_FORMAT',
      };
      res.status(401).json(response);
      return;
    }

    // Verify token and extract payload
    const payload = verifyToken(token);
    
    // Attach user information to request
    (req as AuthenticatedRequest).user = payload;
    
    next();
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      message: error instanceof Error ? error.message : 'Authentication failed',
      error: 'AUTH_FAILED',
    };
    res.status(401).json(response);
  }
}

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 * @param {UserRole[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Express middleware function
 */
export function authorize(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      
      if (!authenticatedReq.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'NOT_AUTHENTICATED',
        };
        res.status(401).json(response);
        return;
      }

      const userRole = authenticatedReq.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        const response: ApiResponse = {
          success: false,
          message: 'Insufficient permissions to access this resource',
          error: 'INSUFFICIENT_PERMISSIONS',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        message: 'Authorization failed',
        error: 'AUTHORIZATION_FAILED',
      };
      res.status(403).json(response);
    }
  };
}

/**
 * Admin-only authorization middleware
 * Shorthand for authorize([UserRole.ADMIN])
 */
export const adminOnly = authorize([UserRole.ADMIN]);

/**
 * Authenticated users authorization middleware
 * Allows both admin and regular users
 */
export const authenticatedUsers = authorize([UserRole.ADMIN, UserRole.USER]);

/**
 * Optional authentication middleware
 * Attaches user info if token is present but doesn't require authentication
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      
      if (token) {
        try {
          const payload = verifyToken(token);
          (req as AuthenticatedRequest).user = payload;
        } catch (error) {
          // Token is invalid but we don't fail the request
          console.warn('Invalid token in optional auth:', error);
        }
      }
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth errors
    console.warn('Optional auth error:', error);
    next();
  }
}
