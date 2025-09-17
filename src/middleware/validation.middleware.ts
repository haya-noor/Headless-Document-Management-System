/**
 * Validation middleware
 * Handles request validation using Zod schemas
 */

import { z } from 'zod';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Create validation middleware for request body
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        res.status = 400;
        return {
          success: false,
          message: 'Invalid request body',
          error: 'VALIDATION_ERROR',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      req.validatedBody = result.data;
      return next();
    } catch (error) {
      res.status = 400;
      return {
        success: false,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
      };
    }
  };
}

/**
 * Create validation middleware for query parameters
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        res.status = 400;
        return {
          success: false,
          message: 'Invalid query parameters',
          error: 'VALIDATION_ERROR',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      req.validatedQuery = result.data;
      return next();
    } catch (error) {
      res.status = 400;
      return {
        success: false,
        message: 'Query validation failed',
        error: 'VALIDATION_ERROR',
      };
    }
  };
}

/**
 * Create validation middleware for URL parameters
 */
export function validateParams(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      const result = schema.safeParse(req.params);
      if (!result.success) {
        res.status = 400;
        return {
          success: false,
          message: 'Invalid URL parameters',
          error: 'VALIDATION_ERROR',
          details: result.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        };
      }
      req.validatedParams = result.data;
      return next();
    } catch (error) {
      res.status = 400;
      return {
        success: false,
        message: 'Parameter validation failed',
        error: 'VALIDATION_ERROR',
      };
    }
  };
}

/**
 * Error handling middleware
 */
export function errorHandler(error: any, req: any, res: any, next: any) {
  console.error('Error:', error);
  
  res.status = error.status || 500;
  return {
    success: false,
    message: error.message || 'Internal server error',
    error: error.code || 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
}
