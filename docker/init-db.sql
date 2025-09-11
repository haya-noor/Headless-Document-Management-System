-- Database initialization script
-- This script runs when PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create application user (additional user for security)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'app_user') THEN
      
      CREATE ROLE app_user LOGIN PASSWORD 'app_password';
   END IF;
END
$do$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE document_management TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_user;

-- Create indexes for better performance (will be created after tables exist)
-- These will be created by Drizzle migrations

-- Initialization complete
SELECT 'Database initialization completed' as status;
