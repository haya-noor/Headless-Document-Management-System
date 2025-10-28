import { Elysia } from 'elysia';
import { v4 as uuid } from 'uuid';
import { performance } from 'perf_hooks';
import logger from '@/presentation/utils/logger';

// loginPlugin creates a requestId via uuid and logs 
export const logPlugin = new Elysia()
  .derive(({ request, headers }) => {
    const requestId = uuid();
    const startTime = performance.now();
    const userAgent = headers['user-agent'] || 'unknown';
    const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';

    logger.info({ 
      requestId, 
      path: request.url, 
      method: request.method,
      userAgent,
      ip,
      timestamp: new Date().toISOString()
    }, 'Incoming request');

    return { 
      requestId,
      startTime,
      userAgent,
      ip
    };
  })
  .onAfterHandle(({ request, set, requestId, startTime, userAgent, ip }) => {
    const duration = performance.now() - startTime;
    const statusCode = set.status || 200;

    logger.info({
      requestId,
      path: request.url,
      method: request.method,
      statusCode,
      duration: Math.round(duration),
      userAgent,
      ip,
      timestamp: new Date().toISOString()
    }, 'Request completed');

    // Log performance warnings
    if (duration > 1000) {
      logger.warn({
        requestId,
        path: request.url,
        method: request.method,
        duration: Math.round(duration)
      }, 'Slow request detected');
    }
  })
  .onError(({ error, request, requestId, startTime }) => {
    const duration = typeof startTime === 'number' ? performance.now() - startTime : 0;

    logger.error({
      requestId,
      path: request.url,
      method: request.method,
      error: (error as { message?: string })?.message ?? String(error),
      stack: (error as { stack?: string })?.stack,
      duration: Math.round(duration),
      timestamp: new Date().toISOString()
    }, 'Request failed');
  });