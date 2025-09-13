/**
 * Test application instance
 * Creates Express app without starting server for testing
 */

import express from 'express';
import { config } from '../src/config';
import {
  corsMiddleware,
  securityMiddleware,
  loggingMiddleware,
  timeoutMiddleware,
  requestIdMiddleware,
  globalErrorHandler,
  notFoundHandler,
} from '../src/middleware';
import { authenticate, adminOnly } from '../src/middleware/auth';
import { authRoutes } from '../src/controllers/auth.controller';
import { fileRoutes } from '../src/controllers/file.controller';

/**
 * Create test application without starting server
 */
function createTestApp(): express.Application {
  const app = express();

  // Middleware
  app.use(securityMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestIdMiddleware);
  app.use(timeoutMiddleware(30000));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Service is healthy',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.nodeEnv,
        version: '1.0.0',
      },
    });
  });

  // API routes
  const apiRouter = express.Router();

  // Authentication routes (public)
  apiRouter.post('/auth/register', ...authRoutes.register);
  apiRouter.post('/auth/login', ...authRoutes.login);

  // Authentication routes (protected)
  apiRouter.post('/auth/logout', authenticate, authRoutes.logout);
  apiRouter.get('/auth/me', authenticate, authRoutes.getProfile);
  apiRouter.put('/auth/profile', authenticate, authRoutes.updateProfile);
  apiRouter.put('/auth/password', authenticate, ...authRoutes.changePassword);
  apiRouter.post('/auth/refresh', authenticate, authRoutes.refreshToken);

  // File serving routes
  apiRouter.get('/files/:key', fileRoutes.serveFile);
  apiRouter.get('/files/download/:key', fileRoutes.downloadFile);
  apiRouter.get('/files/:key/info', authenticate, fileRoutes.getFileInfo);
  apiRouter.delete('/files/:key', authenticate, adminOnly, fileRoutes.deleteFile);

  // Document routes (placeholders)
  apiRouter.get('/documents', authenticate, (req, res) => {
    res.status(501).json({
      success: false,
      message: 'GET /documents endpoint not yet implemented',
      error: 'NOT_IMPLEMENTED',
    });
  });

  apiRouter.post('/documents', authenticate, (req, res) => {
    res.status(501).json({
      success: false,
      message: 'POST /documents endpoint not yet implemented',
      error: 'NOT_IMPLEMENTED',
    });
  });

  // API documentation route
  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Headless Document Management System API',
      data: {
        version: 'v1',
        documentation: '/api/docs',
        endpoints: {
          auth: {
            register: 'POST /api/v1/auth/register',
            login: 'POST /api/v1/auth/login',
            logout: 'POST /api/v1/auth/logout',
            profile: 'GET /api/v1/auth/me',
          },
        },
      },
    });
  });

  // Mount API router
  app.use('/api/v1', apiRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}

export default createTestApp();
