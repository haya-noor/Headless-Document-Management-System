/**
 * Global Test Setup
 * -----------------
 * - Loads .env-test-repo for test-specific DB config
 * - Initializes deterministic faker + fast-check
 * - Exports Effect runners for async and sync testing
 * - Provides common test helpers
 */

import { Effect } from "effect"
import { faker } from "@faker-js/faker"
import fc from "fast-check"
import * as dotenv from "dotenv"
import path from "path"

// Load the test-specific env file (.env-test-repo)
const envPath = path.resolve(process.cwd(), ".env-test-repo")
dotenv.config({ path: envPath })

// Fail early if required environment variables are missing
if (!process.env.DATABASE_URL) {
  throw new Error(
    `❌ DATABASE_URL is missing in ${envPath}. Please check .env-test-repo`
  )
}

// ---------------------------------------------
// Deterministic test configuration
// ---------------------------------------------

// Seed faker for reproducible fake data
faker.seed(42)

// Configure fast-check for stable fuzzing
fc.configureGlobal({
  numRuns: 50,
  endOnFailure: true,
})

// ---------------------------------------------
// Effect Runners
// ---------------------------------------------

export const runEffect = async <A, E>(fx: Effect.Effect<A, E, never>): Promise<A> =>
  await Effect.runPromise(fx)

export const runEffectSync = <A, E>(fx: Effect.Effect<A, E, never>): A =>
  Effect.runSync(fx)

export const runEffectWithError = async <A, E>(fx: Effect.Effect<A, E, never>): Promise<A> => {
  try {
    return await Effect.runPromise(fx)
  } catch (error) {
    throw extractError(error)
  }
}

export const runEffectSyncWithError = <A, E>(fx: Effect.Effect<A, E, never>): A => {
  try {
    return Effect.runSync(fx)
  } catch (error) {
    throw extractError(error)
  }
}

// ---------------------------------------------
// Error Extraction Utility
// ---------------------------------------------

const extractError = (error: any): any => {
  if (!error || typeof error !== "object") return error

  if (error._tag && /Error|Validation/.test(error._tag)) return error

  const cause = error.cause
  if (cause && typeof cause === "object") {
    if ("error" in cause) return extractError(cause.error)
    if (cause._tag && /Error|Validation/.test(cause._tag)) return cause
    return extractError(cause)
  }

  return error
}

// ---------------------------------------------
// Common Test Helpers
// ---------------------------------------------

export const randomUuid = (): string => faker.string.uuid()

export const randomDate = (): Date =>
  faker.date.between({
    from: "2015-01-01T00:00:00.000Z",
    to: new Date().toISOString(),
  })

export const testLogger = (scope: string, ...args: any[]) => {
  if (process.env.DEBUG_TESTS === "true") {
    console.log(`[${scope}]`, ...args)
  }
}

export { faker, fc }
