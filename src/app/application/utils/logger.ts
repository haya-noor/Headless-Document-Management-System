// src/utils/logger.ts

import { inspect } from "util"

type LogLevel = "info" | "warn" | "error" | "debug"

export interface LogContext {
  level: LogLevel
  correlationId?: string
  userId?: string
  workspaceId?: string
  operation?: string
  durationMs?: number
  error?: unknown
  [key: string]: unknown
}

/**
 * Safely removes sensitive values before logging.
 * This prevents secrets like passwords or tokens from being written to logs.
 */

function redactSensitive(data: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...data }
  const sensitiveKeys = ["password", "token", "authorization", "secret", "fileBuffer"]
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      redacted[key] = "***REDACTED***"
    }
  }
  return redacted
}

/**
 * Base structured logging function.
 *  This is the core logging function.
 * - Adds timestamp
 * - Redacts sensitive values
 * - Serializes log data
 * - Handles output in dev vs plain JSON in prod
 */
function baseLog({ level, ...context }: LogContext, message: string) {
  const timestamp = new Date().toISOString()
  const safeContext = redactSensitive(context)
  const logEntry = {
    timestamp,
    level,
    message,
    ...safeContext,
  }

  const output = JSON.stringify(
    logEntry,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
  )

  // In dev, show color-coded logs in console
  if (process.env.NODE_ENV !== "production") {
    const color =
      level === "error"
        ? "\x1b[31m"                     // red for error
        : level === "warn"
        ? "\x1b[33m"                     // yellow for warn
        : level === "debug"
        ? "\x1b[36m"                     // cyan for debug
        : "\x1b[32m"                     // green for info
    console.log(color, output, "\x1b[0m")
  } else {
    console[level === "error" ? "error" : "log"](output) // In prod, just log plain JSON
  }
}

/**
 * Public logging API.
 * Wraps `baseLog` for different log levels and standardizes behavior.
 */
export const logger = {
   /**
   * Log an informational message.
   * Common for successful events, startup messages, etc.
   */
  info: (ctx: Partial<LogContext>, msg: string) =>
    baseLog({ level: "info", ...ctx }, msg),

    /**
   * Log a warning.
   * Used for non-breaking issues, e.g., "file missing, using fallback".
   */
  warn: (ctx: Partial<LogContext>, msg: string) =>
    baseLog({ level: "warn", ...ctx }, msg),

  /**
   * Log an error.
   * Used for critical failures, e.g., "database connection failed".
   */
  error: (ctx: Partial<LogContext>, msg: string | Error) => {
    const isErr = msg instanceof Error
    const errCtx: LogContext = {
      level: "error",
      error: isErr ? inspect(msg, { depth: 5 }) : msg,
      ...ctx,
    } as LogContext
    baseLog(errCtx, isErr ? msg.message : msg.toString())
  },

  /**
   * Log a debug message.
   * Useful for local development or verbose logging in lower environments.
   */
  debug: (ctx: Partial<LogContext>, msg: string) =>
    baseLog({ level: "debug", ...ctx }, msg),
}
