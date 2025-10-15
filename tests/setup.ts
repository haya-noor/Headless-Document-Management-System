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
