/**
 * Error handling middleware for Express.js
 * Centralizes error handling and provides consistent error responses
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { config } from '../config';

/**
 * Custom application error class
 * Extends Error with additional properties for HTTP status and error codes
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found error handler
 * Handles 404 errors for undefined routes
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

/**
 * Global error handler middleware
 * Catches all errors and sends consistent error responses
 * @param {Error} error - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export function globalErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default error values
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Internal server error';

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  // Handle validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
  }
  // Handle database errors
  else if (error.name === 'DatabaseError') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'Database operation failed';
  }
  // Handle file upload errors
  else if (error.message.includes('File too large')) {
    statusCode = 413;
    errorCode = 'FILE_TOO_LARGE';
    message = 'Uploaded file exceeds size limit';
  }
  else if (error.message.includes('Unexpected field')) {
    statusCode = 400;
    errorCode = 'INVALID_FILE_FIELD';
    message = 'Invalid file upload field';
  }

  // Log error details (but not in production for sensitive data)
  if (config.server.isDevelopment) {
    console.error('Error Details:', {
      message: error.message,
      stack: error.stack,
      statusCode,
      errorCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    // In production, log only essential information
    console.error('Error:', {
      message: error.message,
      statusCode,
      errorCode,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // Prepare error response
  const response: ApiResponse = {
    success: false,
    message,
    error: errorCode,
  };

  // Include stack trace in development
  if (config.server.isDevelopment) {
    response.data = {
      stack: error.stack,
      details: error.message,
    };
  }

  // Send error response
  res.status(statusCode).json(response);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
