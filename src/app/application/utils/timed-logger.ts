// src/utils/timed-logger.ts

import { logger } from "./logger"

/**
 * Wraps an async function to log how long it took and whether it succeeded or failed.
 *
 * A name for the operation (e.g., "uploadDocument", "processInvoice")
 * Optional metadata like correlationId, userId, workspaceId
 * fn : The async function to execute and time
 * The result of the async function, or rethrows the error if it fails
 */



export async function withTiming<T>(
  label: string,
  context: { correlationId?: string; userId?: string; workspaceId?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const durationMs = Date.now() - start
    logger.info({ ...context, operation: label, durationMs }, `${label} succeeded`)
    return result
  } catch (error) {
    const durationMs = Date.now() - start
    logger.error({ ...context, operation: label, durationMs, error }, `${label} failed`)
    throw error
  }
}
