/**
 * Database configuration and connection setup using Drizzle ORM
 * Handles PostgreSQL connection with connection pooling
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../models/schema';

/**
 * Database configuration class
 * Manages PostgreSQL connection using postgres.js driver
 */
export class DatabaseConfig {
  private static instance: DatabaseConfig;
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;

  private constructor() {}

  /**
   * Singleton pattern for database configuration
   * @returns {DatabaseConfig} Database configuration instance
   */
  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  /**
   * Initialize database connection
   * Creates connection pool and Drizzle ORM instance
   * @returns {Promise<void>}
   */
  public async connect(): Promise<void> {
    try {
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Create postgres client with connection pooling
      this.client = postgres(connectionString, {
        max: 10, // Maximum number of connections
        idle_timeout: 20, // Close idle connections after 20 seconds
        connect_timeout: 10, // Connection timeout in seconds
      });

      // Initialize Drizzle ORM with schema
      this.db = drizzle(this.client, { schema });

      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Get Drizzle database instance
   * @returns {ReturnType<typeof drizzle>} Drizzle database instance
   * @throws {Error} If database is not connected
   */
  public getDatabase(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end();
        this.client = null;
        this.db = null;
        console.log('✅ Database disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean} Connection status
   */
  public isConnected(): boolean {
    return this.client !== null && this.db !== null;
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection test result
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseConfig = DatabaseConfig.getInstance();
