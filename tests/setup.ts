/**
 * Global test setup
 * -----------------
 * - Initializes Effect runtime
 * - Configures faker + fast-check for reproducible randomness
 * - Exports shared helpers for domain and integration tests
 */

import { Effect, Layer, Context } from "effect"
import { faker } from "@faker-js/faker"
import fc from "fast-check"

// Deterministic randomization — ensures reproducible tests
faker.seed(42)
fc.configureGlobal({ numRuns: 50, endOnFailure: true })

// Effect test runtime (used via Effect.runPromise)
export const runEffect = async <A, E>(fx: Effect.Effect<A, E, never>): Promise<A> =>
  await Effect.runPromise(fx)

// Effect test runtime for error handling (used via Effect.runSync)
export const runEffectSync = <A, E>(fx: Effect.Effect<A, E, never>): A =>
  Effect.runSync(fx)

// Effect test runtime that properly handles errors
export const runEffectWithError = async <A, E>(fx: Effect.Effect<A, E, never>): Promise<A> => {
  try {
    return await Effect.runPromise(fx)
  } catch (error) {
    const extractedError = extractError(error)
    throw extractedError
  }
}

// Helper function to extract the actual error from FiberFailure
const extractError = (error: any): any => {
  if (!error || typeof error !== 'object') {
    return error
  }
  
  // If it's already the error we want, return it
  if (error._tag && (error._tag.includes('Error') || error._tag.includes('Validation'))) {
    return error
  }
  
  // Check if it has a cause property
  if ('cause' in error) {
    const cause = error.cause
    if (cause && typeof cause === 'object') {
      // Check if cause has an error property
      if ('error' in cause) {
        return extractError(cause.error)
      }
      // Check if cause itself is the error we want
      if (cause._tag && (cause._tag.includes('Error') || cause._tag.includes('Validation'))) {
        return cause
      }
      // Recursively check nested causes
      return extractError(cause)
    }
  }
  
  return error
}

// Effect test runtime that uses runSync for error handling
export const runEffectSyncWithError = <A, E>(fx: Effect.Effect<A, E, never>): A => {
  try {
    return Effect.runSync(fx)
  } catch (error) {
    const extractedError = extractError(error)
    throw extractedError
  }
}

// Helper for generating random UUIDs
export const randomUuid = (): string => faker.string.uuid()

// Helper for generating random date (within last 10 years)
export const randomDate = (): Date =>
  faker.date.between({ from: "2015-01-01T00:00:00.000Z", to: new Date().toISOString() })

// Shared test logger (optional)
export const testLogger = (scope: string, ...args: any[]) => {
  if (process.env.DEBUG_TESTS === "true") {
    console.log(`[${scope}]`, ...args)
  }
}

export { faker, fc }
