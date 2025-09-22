/**
 * Configuration utilities
 * Shared utilities for configuration modules
 */

import dotenv from 'dotenv';

// Load environment variables from .env file (don't override existing env vars)
// Only load if not already loaded
if (!process.env._DOTENV_LOADED) {
  dotenv.config({ override: false });
  process.env._DOTENV_LOADED = 'true';
}

/**
 * Validate required environment variables
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment variable value
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || defaultValue!;
}
