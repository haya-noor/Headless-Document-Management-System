/**
 * Jest environment setup
 * Sets environment variables before tests run
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001'; // Use different port for tests
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = 'postgresql://dms_user:dms_password@localhost:5432/document_management';
process.env.STORAGE_PROVIDER = 'local';
process.env.LOCAL_STORAGE_PATH = './tests/temp-storage';

// Disable logging during tests
process.env.LOG_LEVEL = 'error';
