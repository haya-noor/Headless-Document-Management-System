import { Elysia } from 'elysia';
import logger from '@/presentation/utils/logger';

export const securityPlugin = new Elysia()
  .onError(({ error, set, request }) => {
    const sanitizedError = sanitizeError(error);
    
    logger.error({
      path: request.url,
      method: request.method,
      error: sanitizedError.message,
      stack: sanitizedError.stack,
      timestamp: new Date().toISOString()
    }, 'Request error');

    // Set appropriate status code
    if (error.message.includes('Unauthorized')) {
      set.status = 401;
    } else if (error.message.includes('Forbidden') || error.message.includes('Access denied')) {
      set.status = 403;
    } else if (error.message.includes('Not found')) {
      set.status = 404;
    } else if (error.message.includes('Conflict')) {
      set.status = 409;
    } else {
      set.status = 500;
    }

    return {
      success: false,
      message: sanitizedError.message,
      error: process.env.NODE_ENV === 'development' ? sanitizedError.details : undefined
    };
  });

function sanitizeError(error: unknown): { message: string; stack?: string; details?: unknown } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    };
  }

  return {
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? error : undefined
  };
}