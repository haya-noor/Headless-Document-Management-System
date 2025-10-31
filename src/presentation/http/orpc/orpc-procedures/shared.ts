import { Effect as E } from "effect"
import { mapError } from "../presentation-error"
import { createContext, toUserContext, type UserContext } from "../auth"

/**
 * Runs an Effect and maps errors to ORPC errors
 */
export const runEffect = <T>(eff: E.Effect<T, unknown, never>): Promise<T> =>
  E.runPromise(eff).catch((error) => {
    throw mapError(error)
  })

/**
 * Creates authenticated context from headers
 * Returns UserContext(like userId, workspaceId, correlationId) for use in workflows
 */
export async function createAuthenticatedContext(headers: Headers): Promise<UserContext> {
  const rpcContext = await runEffect(createContext(headers))
  return toUserContext(rpcContext)
}

export interface RpcHandlerOptions {
  headers: Headers
  request?: Request
}

/**
 * Enriches DTO with user context data
 * Adds userId and workspaceId to the input payload for workflow consumption
 */
export const enrichDTOWithContext = <T extends Record<string, unknown>>(
  input: T,
  user: UserContext
): T & { userId: string; workspaceId: string } => ({
  ...input,
  userId: user.userId,
  workspaceId: user.workspaceId
})
