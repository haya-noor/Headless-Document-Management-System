/**
 * Validation middleware using Zod schemas
 * Provides request validation for body, params, and query parameters
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../types';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against Zod schema
 * @param {Object} schemas - Object containing validation schemas
 * @param {ZodSchema} schemas.body - Schema for request body validation
 * @param {ZodSchema} schemas.params - Schema for request params validation
 * @param {ZodSchema} schemas.query - Schema for request query validation
 * @returns {Function} Express middleware function
 */
export function validateRequest(schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Validate request parameters
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      // Validate query parameters
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          data: { validationErrors },
        };

        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: false,
        message: 'Request validation failed',
        error: 'VALIDATION_FAILED',
      };

      res.status(400).json(response);
    }
  };
}

/**
 * Body validation middleware
 * Validates only request body
 * @param {ZodSchema} schema - Zod schema for body validation
 */
export function validateBody(schema: ZodSchema) {
  return validateRequest({ body: schema });
}

/**
 * Params validation middleware
 * Validates only request parameters
 * @param {ZodSchema} schema - Zod schema for params validation
 */
export function validateParams(schema: ZodSchema) {
  return validateRequest({ params: schema });
}

/**
 * Query validation middleware
 * Validates only query parameters
 * @param {ZodSchema} schema - Zod schema for query validation
 */
export function validateQuery(schema: ZodSchema) {
  return validateRequest({ query: schema });
}
