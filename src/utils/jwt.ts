/**
 * JWT utility functions for token generation and verification
 * Handles authentication token creation, validation, and extraction
 */

import * as jwt from 'jsonwebtoken';
import { config } from '../config';
import { JWTPayload, UserRole } from '../types';

/**
 * Generate JWT token for authenticated user
 * @param {Object} payload - Token payload containing user information
 * @param {string} payload.userId - User unique identifier
 * @param {string} payload.email - User email address
 * @param {UserRole} payload.role - User role (admin/user)
 * @returns {string} Signed JWT token
 */
export function generateToken(payload: {
  userId: string;
  email: string;
  role: UserRole;
}): string {
  try {
    const tokenPayload: JWTPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'document-management-system',
      audience: 'document-management-users',
    } as jwt.SignOptions);
  } catch (error) {
    throw new Error(`Token generation failed: ${error}`);
  }
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {JWTPayload} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'document-management-system',
      audience: 'document-management-users',
    } as jwt.VerifyOptions) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error(`Token verification failed: ${error}`);
    }
  }
}

/**
 * Extract token from Authorization header
 * Supports Bearer token format: "Bearer <token>"
 * @param {string} authHeader - Authorization header value
 * @returns {string | null} Extracted token or null if not found
 */
export function extractTokenFromHeader(authHeader: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if token is expired without verifying signature
 * Useful for client-side token validation
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration date
 * @param {string} token - JWT token
 * @returns {Date | null} Expiration date or null if invalid
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}
