/*
createContext(headers) → Builds RPCContext

Extracts JWT → Verifies → Decodes → Extracts workspace from JWT or x-workspace-id header
Adds correlationId for observability and tracing
Returns a clean context object with actorId, workspaceId, roles, rawPayload, and correlationId

RPCContext and UserContext are two different contexts.
RPCContext is used at the Http/Presentation Layer or boundry.
UserContext is used at the Business Logic/Workflows.

RPCContext is used to pass the context to the oRPC procedures.
UserContext is used to pass the context to the workflows.


*/

import { Effect, Option } from "effect"
import { verify } from "jsonwebtoken"
import { ORPCError } from "./presentation-error"
import {
  JWT_CONFIG,
  type JWTPayload,
  decodeJWTPayload,
  getUserIdFromPayload,
  getWorkspaceId
} from "@/app/infrastructure/config/jwt.config"
import type { UserId, WorkspaceId } from "@/app/domain/refined/uuid"
import { Schema as S } from "effect"

/**
 * 
 * RPC Context (HTTP/Presentation Layer)) used at the Http/Presentation Layer or boundry. 
 * 
 * 
 * Context object passed to all oRPC procedures, containing:
 * - actorId: The authenticated user ID
 * - workspaceId: Optional workspace context
 * - roles: User roles for authorization
 * - rawPayload: Full JWT payload for advanced use cases
 * - correlationId: Unique ID per request for logging/observability
 */
export interface RPCContext {
  readonly actorId: UserId
  readonly workspaceId: Option.Option<WorkspaceId>
  readonly roles: readonly ("admin" | "user")[]
  readonly rawPayload: JWTPayload
  readonly correlationId: string
}

/**
 * UserContext: Used at  (Business Logic/Workflows)
 * User Context - Simplified interface for use cases/workflows
 * This is a flattened version of RPCContext for easier use in business logic
 */
export interface UserContext {
  readonly userId: UserId
  readonly workspaceId: WorkspaceId
  readonly roles: readonly ("admin" | "user")[]
  readonly correlationId: string
}

/**
 * Convert RPCContext to UserContext for use in workflows
 * Throws if workspace is not available
 */
export function toUserContext(ctx: RPCContext): UserContext {
  const workspaceId = Option.getOrElse(
    ctx.workspaceId,
    () => {
      throw new ORPCError("FORBIDDEN", 403, {
        message: "Workspace context is required for this operation",
        code: "MISSING_WORKSPACE",
        details: "This operation requires a workspace-scoped context"
      })
    }
  )

  return {
    userId: ctx.actorId,
    workspaceId,
    roles: ctx.roles,
    correlationId: ctx.correlationId
  }
}

/**
 * Extracts correlation ID from headers or generates a new one.
 */
function getCorrelationId(headers: Headers): string {
  return headers.get("x-correlation-id") ?? crypto.randomUUID()
}

/**
 1: Extract Authorization Header
 */
function extractAuthHeader(headers: Headers): Effect.Effect<string, ORPCError> {
  return Effect.sync(() => {
    const authHeader = headers.get(JWT_CONFIG.HEADER_NAME)

    if (!authHeader) {
      throw new ORPCError("UNAUTHORIZED", 401, {
        message: "Missing Authorization header",
        code: "MISSING_AUTH_HEADER",
        details: "Authorization header is required for authenticated requests"
      })
    }

    if (!authHeader.startsWith(JWT_CONFIG.TOKEN_PREFIX)) {
      throw new ORPCError("UNAUTHORIZED", 401, {
        message: `Authorization header must start with "${JWT_CONFIG.TOKEN_PREFIX}"`,
        code: "INVALID_AUTH_HEADER_FORMAT",
        details: `Expected format: "${JWT_CONFIG.TOKEN_PREFIX}<token>"`
      })
    }

    const token = authHeader.slice(JWT_CONFIG.TOKEN_PREFIX.length)
    if (!token.trim()) {
      throw new ORPCError("UNAUTHORIZED", 401, {
        message: "Empty token after Bearer prefix",
        code: "EMPTY_TOKEN",
        details: "JWT token is required"
      })
    }

    return token
  })
}

/**
 2: Verify JWT Token
 */
function verifyJWT(token: string): Effect.Effect<JWTPayload, ORPCError> {
  return Effect.tryPromise({
    try: async () => {
      const rawPayload = await new Promise((resolve, reject) => {
        verify(token, JWT_CONFIG.SECRET, { algorithms: [JWT_CONFIG.ALGORITHM] }, (err, decoded) => {
          if (err) reject(err)
          else resolve(decoded)
        })
      })

      return await Effect.runPromise(
        decodeJWTPayload(rawPayload).pipe(
          Effect.mapError((error: unknown) => {
            throw new ORPCError("UNAUTHORIZED", 401, {
              message: "JWT payload validation failed",
              code: "INVALID_JWT_PAYLOAD",
              details: error instanceof Error ? error.message : String(error)
            })
          })
        )
      )
    },
    catch: (error: unknown) => {
      if (error instanceof ORPCError) return error

      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes("expired") || errorMessage.includes("exp")) {
        return new ORPCError("UNAUTHORIZED", 401, {
          message: "JWT token has expired",
          code: "EXPIRED_TOKEN",
          details: "Please obtain a new token"
        })
      }

      return new ORPCError("UNAUTHORIZED", 401, {
        message: "JWT token verification failed",
        code: "INVALID_TOKEN",
        details: errorMessage
      })
    }
  })
}

/**
 3: Derive Workspace Context
 */
function deriveWorkspace(
  payload: JWTPayload,
  headers: Headers
): Effect.Effect<Option.Option<WorkspaceId>, ORPCError> {
  return Effect.gen(function* () {
    const jwtWorkspace = getWorkspaceId(payload)
    const headerValue = headers.get("x-workspace-id")

    if (!headerValue) {
      if (Option.isNone(jwtWorkspace)) {
        return yield* Effect.fail(new ORPCError("FORBIDDEN", 403, {
          message: "Workspace context is required for this operation",
          code: "MISSING_WORKSPACE",
          details: "Requires either an x-workspace-id header or workspace in JWT"
        }))
      }
      return jwtWorkspace
    }

    const headerWorkspace = yield* S.decodeUnknown(S.String)(headerValue).pipe(
      Effect.mapError((error: unknown) =>
        new ORPCError("BAD_REQUEST", 400, {
          message: "Invalid workspace ID in x-workspace-id header",
          code: "INVALID_WORKSPACE_ID",
          details: error instanceof Error ? error.message : String(error)
        })
      )
    )

    if (Option.isSome(jwtWorkspace)) {
      const jwtWorkspaceValue = Option.getOrElse(jwtWorkspace, () => null as WorkspaceId | null)
      if (jwtWorkspaceValue && headerWorkspace !== jwtWorkspaceValue) {
        return yield* Effect.fail(new ORPCError("FORBIDDEN", 403, {
          message: "Workspace mismatch between JWT and header",
          code: "WORKSPACE_MISMATCH",
          headerWorkspace,
          jwtWorkspace: jwtWorkspaceValue
        }))
      }
    }

    return Option.some(headerWorkspace as WorkspaceId)
  })
}

/**
4: Build RPCContext
 */
function buildContext(
  payload: JWTPayload,
  workspaceId: Option.Option<WorkspaceId>,
  correlationId: string
): Effect.Effect<RPCContext, never> {
  return Effect.succeed({
    actorId: getUserIdFromPayload(payload),
    workspaceId,
    roles: payload.roles,
    rawPayload: payload,
    correlationId
  })
}

/**
 * Builds the RPCContext used in authenticated RPC handlers.
 * Extracts user identity, workspace, roles, and correlationId for observability.
 */
export function createContext(headers: Headers): Effect.Effect<RPCContext, ORPCError> {
  return Effect.gen(function* () {
    const correlationId = getCorrelationId(headers) // get correlation id from headers

    const token = yield* extractAuthHeader(headers) // extract token from headers
    const payload = yield* verifyJWT(token) // verify token
    const workspaceId = yield* deriveWorkspace(payload, headers) // derive workspace id from payload

    const context = yield* buildContext(payload, workspaceId, correlationId) // build RPCContext
    return context
  })
}

/**
 * Helper: Attach Actor and Workspace to DTO
 */
export function withActorAndWorkspace<T extends Record<string, unknown>>(
  input: T,
  context: RPCContext
): T & { actorId: UserId; workspaceId: WorkspaceId } {
  return Option.match(context.workspaceId, {
    onNone: () => {
      throw new ORPCError("FORBIDDEN", 403, {
        message: "Workspace context is required for this operation",
        code: "MISSING_WORKSPACE",
        details: "This operation requires a workspace-scoped JWT token"
      })
    },
    onSome: (workspaceId: WorkspaceId) => ({
      ...input,
      actorId: context.actorId,
      workspaceId
    })
  })
}

/**
 * Helper: Create simple context for unauthenticated or internal system calls.
 */
export function createSimpleContext(headers: Headers): Effect.Effect<{ correlationId: string }, never> {
  return Effect.sync(() => ({
    correlationId: getCorrelationId(headers)
  }))
}
