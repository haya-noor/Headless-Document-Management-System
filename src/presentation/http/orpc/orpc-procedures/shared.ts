import { Effect as E } from "effect"
import { mapError } from "../error-mapping"

export const runEffect = <T>(eff: E.Effect<T, unknown, never>): Promise<T> =>
  E.runPromise(eff).catch((error) => {
    throw mapError(error)
  })

export const enrichWithContext = <T extends Record<string, unknown>>(
  input: T,
  context: { userId: string; workspaceId: string }
): T => ({
  ...input,
  userId: context.userId,
  workspaceId: context.workspaceId
})
