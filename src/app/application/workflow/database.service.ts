/**
 * Database service
 * Handles PostgreSQL connection using Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../infrastructure/database/models/schema';
import { databaseConfig } from '../../infrastructure/config/database.config';

/**
 * Database service class
 * Manages PostgreSQL connection using postgres.js driver
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;

  private constructor() {}

  /**
   * Singleton pattern for database service
   * @returns {DatabaseService} Database service instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize database connection
   * Creates connection pool and Drizzle ORM instance
   * @returns {Promise<void>}
   */
  public async connect(): Promise<void> {
    try {
      if (!databaseConfig.url) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      // Create postgres client with connection pooling
      this.client = postgres(databaseConfig.url, {
        max: databaseConfig.connectionPool.max,
        idle_timeout: databaseConfig.connectionPool.idleTimeout,
        connect_timeout: databaseConfig.connectionPool.connectTimeout,
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
export const databaseService = DatabaseService.getInstance();
