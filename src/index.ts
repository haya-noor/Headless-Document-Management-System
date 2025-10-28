import "reflect-metadata";
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Middleware imports
import { logPlugin } from './presentation/http/middleware/log.middleware';
import { securityPlugin } from './presentation/http/middleware/security.middleware';
import { authPlugin } from './presentation/http/middleware/auth.middleware';

// Route imports
import { documentRoutes } from './presentation/http/routes/document.routes';
import { uploadRoutes } from './presentation/http/routes/upload.routes';
import { accessPolicyRoutes } from './presentation/http/routes/access-policy.routes';

// Initialize DI container
import './app/infrastructure/di/container';

/**
 * Headless Document Management System
 * Domain-Driven Design Training Project
 * 
 * This project focuses on:
 * - Domain entities and value objects
 * - Repository pattern with Effect
 * - Database integration with Drizzle
 * - Comprehensive testing
 * - Clean Architecture with HTTP layer
 */

const app = new Elysia()
  // Global middleware
  .use(logPlugin)
  .use(securityPlugin)
  .use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'Document Management API',
        version: '1.0.0',
        description: 'Headless Document Management System API'
      },
      tags: [
        { name: 'Documents', description: 'Document management operations' },
        { name: 'Upload', description: 'File upload operations' },
        { name: 'Access Policy', description: 'Access control operations' }
      ]
    }
  }))
  
  // Health check endpoint
  .get('/health', () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'document-management-system'
  }))
  
  // API routes
  .group('/api/v1', (app) =>
    app
      .use(authPlugin)
      .use(documentRoutes)
      .use(uploadRoutes)
      .use(accessPolicyRoutes)
  )
  
  // Root endpoint
  .get('/', () => ({
    message: 'Document Management System API',
    version: '1.0.0',
    docs: '/swagger'
  }))
  
  // Error handling
  .onError(({ error, set }) => {
    console.error('Unhandled error:', error);
    set.status = 500;
    return {
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    };
  });

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Headless Document Management System             ║
║                                                              ║
║  🎯 Domain-Driven Design Training Project                   ║
║  📚 Focus: Entities, Value Objects, Repositories            ║
║  🧪 Testing: Unit, Integration, Property-based              ║
║  🌐 HTTP API with Clean Architecture                        ║
║                                                              ║
║  🚀 Server running on: http://${host}:${port}                ║
║  📖 API Documentation: http://${host}:${port}/swagger        ║
║  ❤️  Health Check: http://${host}:${port}/health             ║
║                                                              ║
║  Run tests with: bun test                                   ║
║  Domain tests: bun test tests/domain/                       ║
║  Integration tests: bun test tests/integration/             ║
╚══════════════════════════════════════════════════════════════╝
`);
});

export default app;
