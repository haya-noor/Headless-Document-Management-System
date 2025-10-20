/**
 * Server configuration
 * server.config.ts → Server settings (port for URLs)
 * Contains server-related configuration settings used by storage services
 * 
 * Used by:
 * - src/app/infrastructure/storage/local-storage.ts (for generating file URLs)
 *   Line 100: const baseUrl = `http://localhost:${serverConfig.port}`;
 *   Line 369: const baseUrl = `http://localhost:${serverConfig.port}`;
 * 
 * Configuration:
 *  this file exposes the port number for for building URLs to access stored files. 
 *  used in : (local-storage.ts → to generate file URLs and download links.s)
 * - PORT: number (default: 3002)
 * - Loaded from .env file via getEnvVar utility
 */

import { getEnvVar } from './utils';

export const serverConfig = {
  port: parseInt(getEnvVar('PORT', '3002')),
} as const;