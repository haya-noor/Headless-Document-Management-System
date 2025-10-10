/**
 * Jest Setup File
 * Global test configuration and setup
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';

// Global test timeout
const TEST_TIMEOUT = 30000;

// Setup global test environment
beforeAll(async () => {
  // Set test timeout
  if (typeof globalThis.setTimeout !== 'undefined') {
    globalThis.setTimeout(TEST_TIMEOUT);
  }
  
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  console.log('🧹 Test environment cleaned up');
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Clean up after each test
afterEach(() => {
  // Clear any timers
  if (typeof globalThis.clearTimeout !== 'undefined') {
    globalThis.clearTimeout();
  }
});
