/**
 * Middleware index file
 * Exports all middleware functions and common middleware configurations
 */

export * from './auth';
export * from './validation';
export * from './error';
export * from './logging';

import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '../config';

/**
 * CORS configuration
 * Allows cross-origin requests with proper security headers
 */
export const corsMiddleware = cors({
  origin: config.server.isDevelopment 
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173']
    : process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
});

/**
 * Security middleware configuration using Helmet
 * Sets various HTTP headers for security
 */
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for file downloads
});

/**
 * Logging middleware configuration using Morgan
 * Different formats for development and production
 */
export const loggingMiddleware = morgan(
  config.server.isDevelopment 
    ? 'dev' 
    : 'combined',
  {
    // Skip logging for health check endpoints
    skip: (req: Request) => req.url === '/health' || req.url === '/favicon.ico',
  }
);

/**
 * Request timeout middleware
 * Prevents long-running requests from hanging
 * @param {number} timeout - Timeout in milliseconds (default: 30 seconds)
 */
export function timeoutMiddleware(timeout: number = 30000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          error: 'REQUEST_TIMEOUT',
        });
      }
    }, timeout);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

/**
 * Request ID middleware
 * Adds unique request ID for tracing and logging
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}
