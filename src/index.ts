/**
 * Main application entry point
 * Initializes Elysia server with all middleware and routes
 */

import WorkingApplication from './app';
import { Logger } from './http/middleware/logging';

// Create and start application
const app = new WorkingApplication();

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
  console.error('Error details:', error);
  process.exit(1);
});

// Don't export the app as default to prevent Bun from auto-starting it
// export default app.app;
