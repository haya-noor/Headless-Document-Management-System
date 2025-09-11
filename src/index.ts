/**
 * Main application entry point
 * Initializes Express server with all middleware and routes
 */

import express from 'express';
import { config, validateConfig } from './config';
import { databaseConfig } from './config/database';
import {
  corsMiddleware,
  securityMiddleware,
  loggingMiddleware,
  timeoutMiddleware,
  requestIdMiddleware,
  globalErrorHandler,
  notFoundHandler,
} from './middleware';
import { authenticate, adminOnly, authenticatedUsers } from './middleware/auth';
import { authRoutes } from './controllers/auth.controller';
import { Logger } from './middleware/logging';

/**
 * Application class
 * Encapsulates Express app configuration and startup logic
 */
class Application {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.validateEnvironment();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironment(): void {
    try {
      validateConfig();
      Logger.info('Environment configuration validated successfully');
    } catch (error) {
      Logger.error('Environment configuration validation failed', { error });
      process.exit(1);
    }
  }

  /**
   * Initialize global middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(securityMiddleware);
    
    // CORS middleware
    this.app.use(corsMiddleware);
    
    // Request processing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging and monitoring middleware
    this.app.use(requestIdMiddleware);
    this.app.use(loggingMiddleware);
    
    // Timeout middleware
    this.app.use(timeoutMiddleware(30000)); // 30 seconds timeout

    Logger.info('Global middleware initialized');
  }

  /**
   * Initialize application routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Service is healthy',
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.server.nodeEnv,
          version: process.env.npm_package_version || '1.0.0',
        },
      });
    });

    // API routes
    this.initializeApiRoutes();

    Logger.info('Application routes initialized');
  }

  /**
   * Initialize API routes with versioning
   */
  private initializeApiRoutes(): void {
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

    // Document routes (will be implemented)
    apiRouter.get('/documents', authenticate, this.placeholderHandler('GET /documents'));
    apiRouter.post('/documents', authenticate, this.placeholderHandler('POST /documents'));
    apiRouter.get('/documents/:id', authenticate, this.placeholderHandler('GET /documents/:id'));
    apiRouter.put('/documents/:id', authenticate, this.placeholderHandler('PUT /documents/:id'));
    apiRouter.delete('/documents/:id', authenticate, this.placeholderHandler('DELETE /documents/:id'));
    apiRouter.get('/documents/:id/download', authenticate, this.placeholderHandler('GET /documents/:id/download'));

    // Document permission routes (will be implemented)
    apiRouter.get('/documents/:id/permissions', authenticate, this.placeholderHandler('GET /documents/:id/permissions'));
    apiRouter.post('/documents/:id/permissions', authenticate, this.placeholderHandler('POST /documents/:id/permissions'));
    apiRouter.put('/documents/:id/permissions/:userId', authenticate, this.placeholderHandler('PUT /documents/:id/permissions/:userId'));
    apiRouter.delete('/documents/:id/permissions/:userId', authenticate, this.placeholderHandler('DELETE /documents/:id/permissions/:userId'));

    // Admin routes
    apiRouter.get('/admin/users', authenticate, adminOnly, this.placeholderHandler('GET /admin/users'));
    apiRouter.get('/admin/stats', authenticate, adminOnly, this.placeholderHandler('GET /admin/stats'));
    apiRouter.get('/admin/audit-logs', authenticate, adminOnly, this.placeholderHandler('GET /admin/audit-logs'));

    // Mount API router
    this.app.use('/api/v1', apiRouter);

    // API documentation route
    this.app.get('/api', (req, res) => {
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
              updateProfile: 'PUT /api/v1/auth/profile',
              changePassword: 'PUT /api/v1/auth/password',
            },
            documents: {
              list: 'GET /api/v1/documents',
              upload: 'POST /api/v1/documents',
              get: 'GET /api/v1/documents/:id',
              update: 'PUT /api/v1/documents/:id',
              delete: 'DELETE /api/v1/documents/:id',
              download: 'GET /api/v1/documents/:id/download',
            },
            permissions: {
              list: 'GET /api/v1/documents/:id/permissions',
              grant: 'POST /api/v1/documents/:id/permissions',
              update: 'PUT /api/v1/documents/:id/permissions/:userId',
              revoke: 'DELETE /api/v1/documents/:id/permissions/:userId',
            },
            admin: {
              users: 'GET /api/v1/admin/users',
              stats: 'GET /api/v1/admin/stats',
              auditLogs: 'GET /api/v1/admin/audit-logs',
            },
          },
        },
      });
    });
  }

  /**
   * Initialize error handling middleware
   */
  private initializeErrorHandling(): void {
    // 404 handler for undefined routes
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(globalErrorHandler);

    Logger.info('Error handling middleware initialized');
  }

  /**
   * Placeholder handler for unimplemented routes
   * @param {string} route - Route description
   */
  private placeholderHandler(route: string) {
    return (req: express.Request, res: express.Response) => {
      res.status(501).json({
        success: false,
        message: `${route} endpoint not yet implemented`,
        error: 'NOT_IMPLEMENTED',
      });
    };
  }

  /**
   * Start the application server
   */
  public async start(): Promise<void> {
    try {
      // Connect to database
      await databaseConfig.connect();
      Logger.info('Database connection established');

      // Start HTTP server
      const port = config.server.port;
      this.app.listen(port, () => {
        Logger.info(`Server started successfully`, {
          port,
          environment: config.server.nodeEnv,
          processId: process.pid,
        });

        // Log startup banner
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Headless Document Management System             ║
║                                                              ║
║  🚀 Server running on port ${port.toString().padEnd(4)}                          ║
║  📊 Environment: ${config.server.nodeEnv.padEnd(11)}                        ║
║  🔗 API Documentation: http://localhost:${port}/api              ║
║  ❤️  Health Check: http://localhost:${port}/health              ║
╚══════════════════════════════════════════════════════════════╝
        `);
      });
    } catch (error) {
      Logger.error('Failed to start application', { error });
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown handler
   */
  public async shutdown(): Promise<void> {
    try {
      Logger.info('Shutting down application gracefully...');
      
      // Close database connection
      await databaseConfig.disconnect();
      Logger.info('Database connection closed');

      Logger.info('Application shutdown completed');
      process.exit(0);
    } catch (error) {
      Logger.error('Error during application shutdown', { error });
      process.exit(1);
    }
  }
}

// Create and start application
const app = new Application();

// Handle graceful shutdown
process.on('SIGTERM', () => app.shutdown());
process.on('SIGINT', () => app.shutdown());

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', { error });
  app.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection', { reason, promise });
  app.shutdown();
});

// Start the application
app.start().catch((error) => {
  Logger.error('Failed to start application', { error });
  process.exit(1);
});

export default app.app;
