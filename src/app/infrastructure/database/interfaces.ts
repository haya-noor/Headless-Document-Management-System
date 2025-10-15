import { Effect } from "effect"

/**
 * Database Interface
 * Defines the contract for database operations
 */
export interface DatabaseInterface {
  /**
   * Execute a raw SQL query
   */
  execute<T = any>(sql: string, params?: any[]): Effect.Effect<T[], never>

  /**
   * Begin a transaction
   */
  transaction<T>(fn: (tx: DatabaseInterface) => Effect.Effect<T, never>): Effect.Effect<T, never>

  /**
   * Close the database connection
   */
  close(): Effect.Effect<void, never>
}
