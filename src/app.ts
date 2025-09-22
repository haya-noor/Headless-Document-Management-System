/**
 * Working Elysia application
 * Headless Document Management System
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { staticPlugin } from '@elysiajs/static';
import { jwt } from '@elysiajs/jwt';
import { config, validateConfig } from './config';
import { databaseConfig } from './config/database';
import { Logger } from './http/middleware/logging';
import { authRoutes, documentRoutes, fileRoutes } from './http/routes';

/**
 * Working Application class using Elysia
 */
class WorkingApplication {
  public app: Elysia;

  constructor() {
    this.app = new Elysia();
    this.validateEnvironment();
    this.initializeMiddleware();
    this.initializeRoutes();
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
    // CORS middleware
    this.app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Security headers
    this.app.onRequest(({ set }) => {
      set.headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '0',
        'Referrer-Policy': 'no-referrer',
        'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self';style-src 'self' 'unsafe-inline';script-src 'self';img-src 'self' data: https:;connect-src 'self';font-src 'self';object-src 'none';media-src 'self';frame-src 'none';base-uri 'self';form-action 'self';frame-ancestors 'self';script-src-attr 'none';upgrade-insecure-requests",
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Origin-Agent-Cluster': '?1',
      };
    });

    // Request ID middleware
    this.app.onRequest(({ set }) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      set.headers['X-Request-ID'] = requestId;
    });

    // JWT middleware
    this.app.use(jwt({
      name: 'jwt',
      secret: config.jwt.secret,
    }));

    // Static file serving
    this.app.use(staticPlugin({
      assets: './storage/documents',
      prefix: '/files',
    }));

    Logger.info('Global middleware initialized');
  }

  /**
   * Initialize application routes
   */
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', () => ({
      success: true,
      message: 'Service is healthy',
      data: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.nodeEnv,
        version: process.env.npm_package_version || '1.0.0',
      },
    }));

    // API documentation route
    this.app.get('/api', () => ({
      success: true,
      message: 'Headless Document Management System API',
      data: {
        version: 'v1',
        documentation: '/swagger',
        endpoints: {
          auth: {
            register: 'POST /api/v1/auth/register',
            login: 'POST /api/v1/auth/login',
            logout: 'POST /api/v1/auth/logout',
            profile: 'GET /api/v1/auth/me',
            updateProfile: 'PUT /api/v1/auth/profile',
            changePassword: 'PUT /api/v1/auth/password',
          },
          files: {
            serve: 'GET /api/v1/files/:key',
            download: 'GET /api/v1/files/download/:key',
            info: 'GET /api/v1/files/:key/info',
            delete: 'DELETE /api/v1/files/:key',
          },
          documents: {
            list: 'GET /api/v1/documents',
            upload: 'POST /api/v1/documents',
            get: 'GET /api/v1/documents/:id',
            update: 'PUT /api/v1/documents/:id',
            delete: 'DELETE /api/v1/documents/:id',
            downloadLink: 'POST /api/v1/documents/:id/download',
            updatePermissions: 'PUT /api/v1/documents/:id/permissions',
            updateMetadata: 'PUT /api/v1/documents/:id/metadata',
            updateTags: 'PUT /api/v1/documents/:id/tags',
          },
        },
      },
    }));

    // API routes
    this.app.group('/api/v1', (app) => {
      // Authentication routes
      app.group('/auth', (authApp) => {
        return authApp
          .use(authRoutes.register)
          .use(authRoutes.login)
          .use(authRoutes.logout)
          .use(authRoutes.getProfile)
          .use(authRoutes.updateProfile)
          .use(authRoutes.changePassword);
      });

      // File serving routes
      app.group('/files', (filesApp) => {
        return filesApp
          .use(fileRoutes.serveFile)
          .use(fileRoutes.uploadFile)
          .use(fileRoutes.generateDownloadLink)
          .use(fileRoutes.deleteFile)
          .use(fileRoutes.getFileMetadata)
          .use(fileRoutes.listFiles)
          .use(fileRoutes.downloadFile)
          .use(fileRoutes.getFileInfo);
      });

      // Document routes
      app.group('/documents', (documentsApp) => {
        return documentsApp
          .use(documentRoutes.uploadDocument)
          .use(documentRoutes.getDocument)
          .use(documentRoutes.searchDocuments)
          .use(documentRoutes.updateDocument)
          .use(documentRoutes.deleteDocument)
          .use(documentRoutes.generateDownloadLink)
          .use(documentRoutes.updatePermissions)
          .use(documentRoutes.updateMetadata)
          .use(documentRoutes.updateTags);
      });

      return app;
    });

    // Swagger documentation
    this.app.use(swagger({
      documentation: {
        info: {
          title: 'Headless Document Management System API',
          version: '1.0.0',
          description: 'A comprehensive backend API for document management with clean architecture',
        },
        tags: [
          { name: 'Authentication', description: 'User authentication and authorization' },
          { name: 'Files', description: 'File operations and management' },
          { name: 'Documents', description: 'Document management (coming soon)' },
        ],
      },
    }));

    Logger.info('Application routes initialized');
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
      
      // Use Elysia's listen method correctly - pass port directly
      this.app.listen(port);
      
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
║  🔗 API Documentation: http://localhost:${port}/swagger        ║
║  ❤️  Health Check: http://localhost:${port}/health              ║
╚══════════════════════════════════════════════════════════════╝
      `);

    } catch (error) {
      Logger.error('Failed to start application', { error });
      throw error; // Re-throw to be caught by the Promise rejection handler
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

export default WorkingApplication;
