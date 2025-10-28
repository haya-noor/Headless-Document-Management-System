import { Effect, Option } from "effect"
import { verify } from "jsonwebtoken"
import { ORPCError } from "./error-mapping"
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
 * RPC Context
 * 
 * Context object passed to all oRPC procedures, containing:
 * - actorId: The authenticated user ID
 * - workspaceId: Optional workspace context
 * - roles: User roles for authorization
 * - rawPayload: Full JWT payload for advanced use cases
 */
export interface RPCContext {
  readonly actorId: UserId
  readonly workspaceId: Option.Option<WorkspaceId>
  readonly roles: readonly ('admin' | 'user')[]
  readonly rawPayload: JWTPayload
}

/**
 * Chain-of-Responsibility Step 1: Extract Authorization Header
 * 
 * Ensures the Authorization header exists and has the correct format.
 * Throws ORPCError with UNAUTHORIZED if missing or malformed.
 */
function extractAuthHeader(headers: Headers): Effect.Effect<string, ORPCError> {
  return Effect.sync(() => {
    const authHeader = headers.get(JWT_CONFIG.HEADER_NAME)
    
    // Header must exist
    if (!authHeader) {
      throw new ORPCError("UNAUTHORIZED", 401, {
        message: "Missing Authorization header",
        code: "MISSING_AUTH_HEADER",
        details: "Authorization header is required for authenticated requests"
      })
    }
    
    // Must start with "Bearer " prefix
    if (!authHeader.startsWith(JWT_CONFIG.TOKEN_PREFIX)) {
      throw new ORPCError("UNAUTHORIZED", 401, {
        message: `Authorization header must start with "${JWT_CONFIG.TOKEN_PREFIX}"`,
        code: "INVALID_AUTH_HEADER_FORMAT",
        details: `Expected format: "${JWT_CONFIG.TOKEN_PREFIX}<token>"`
      })
    }
    
    // Extract token after "Bearer " prefix
    const token = authHeader.slice(JWT_CONFIG.TOKEN_PREFIX.length)
    
    // Token must not be empty
    if (!token || token.trim() === "") {
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
 * Chain-of-Responsibility Step 2: Verify JWT Token
 * 
 * Verifies the JWT signature and decodes the payload.
 * Throws ORPCError with UNAUTHORIZED if verification fails.
 */
function verifyJWT(token: string): Effect.Effect<JWTPayload, ORPCError> {
  return Effect.tryPromise({
    try: async () => {
      // Verify JWT signature using configured secret and algorithm
      const rawPayload = await new Promise((resolve, reject) => {
        verify(token, JWT_CONFIG.SECRET, { algorithms: [JWT_CONFIG.ALGORITHM] }, (err, decoded) => {
          if (err) reject(err)
          else resolve(decoded)
        })
      })
      
      // Validate payload structure using Effect Schema
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
      // Handle ORPCError from payload validation
      if (error instanceof ORPCError) {
        return error
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Check for expired token
      if (errorMessage.includes("expired") || errorMessage.includes("exp")) {
        return new ORPCError("UNAUTHORIZED", 401, {
          message: "JWT token has expired",
          code: "EXPIRED_TOKEN",
          details: "Please obtain a new token"
        })
      }
      
      // Invalid token (signature verification failed)
      return new ORPCError("UNAUTHORIZED", 401, {
        message: "JWT token verification failed",
        code: "INVALID_TOKEN",
        details: errorMessage
      })
    }
  })
}

/**
 * Chain-of-Responsibility Step 3: Derive Workspace Context
 * 
 * Extracts workspace information from the JWT payload and x-workspace-id header.
 * 1. Prefer header if present and validate with S.decodeUnknown
 * 2. If JWT workspace exists and header exists, ensure equality; else error
 * 3. If no header, use JWT Option directly
 * 4. If both absent, error "FORBIDDEN"
 * 
 * Returns Option<WorkspaceId> - workspace may be present or absent.
 */
function deriveWorkspace(
  payload: JWTPayload,
  headers: Headers
): Effect.Effect<Option.Option<WorkspaceId>, ORPCError> {
  return Effect.gen(function* () {
    // Get workspace from JWT
    const jwtWorkspace = getWorkspaceId(payload)
    
    // Read x-workspace-id header (case-insensitive)
    const headerValue = headers.get("x-workspace-id")
    
    // If no header, use JWT workspace or fail if absent
    if (!headerValue) {
      if (Option.isNone(jwtWorkspace)) {
        return yield* Effect.fail(new ORPCError("FORBIDDEN", 403, {
          message: "Workspace context is required for this operation",
          code: "MISSING_WORKSPACE",
          details: "This operation requires either an x-workspace-id header or a workspace-scoped JWT token"
        }))
      }
      return jwtWorkspace
    }
    
    // Header exists - validate it
    const headerWorkspace = yield* S.decodeUnknown(S.String)(headerValue).pipe(
      Effect.mapError((error: unknown) => {
        return new ORPCError("BAD_REQUEST", 400, {
          message: "Invalid workspace ID in x-workspace-id header",
          code: "INVALID_WORKSPACE_ID",
          details: error instanceof Error ? error.message : String(error)
        })
      })
    )
    
    // If JWT also has workspace, ensure they match
    if (Option.isSome(jwtWorkspace)) {
      const jwtWorkspaceValue = Option.getOrElse(jwtWorkspace, () => null as WorkspaceId | null)
      if (jwtWorkspaceValue && headerWorkspace !== jwtWorkspaceValue) {
        return yield* Effect.fail(new ORPCError("FORBIDDEN", 403, {
          message: "Workspace mismatch: x-workspace-id header does not match JWT workspace",
          code: "WORKSPACE_MISMATCH",
          headerWorkspace: headerWorkspace,
          jwtWorkspace: jwtWorkspaceValue
        }))
      }
    }
    
    // Header validated (and matched JWT if present) - return it
    return Option.some(headerWorkspace as WorkspaceId)
  })
}

/**
 * Chain-of-Responsibility Step 4: Build Context
 * 
 * Constructs the final RPC context from the validated JWT payload.
 */
function buildContext(
  payload: JWTPayload,
  workspaceId: Option.Option<WorkspaceId>
): Effect.Effect<RPCContext, never> {
  return Effect.succeed({
    actorId: getUserIdFromPayload(payload),
    workspaceId,
    roles: payload.roles,
    rawPayload: payload
  })
}

/**
 * Create RPC Context - Chain of Responsibility Orchestrator
 * Each step is a pure function that can fail independently.
 * The chain stops at the first failure.
 */
export function createContext(headers: Headers): Effect.Effect<RPCContext, ORPCError> {
  return Effect.gen(function* () {
    // Step 1: Extract and validate Authorization header
    const token = yield* extractAuthHeader(headers)
    
    // Step 2: Verify JWT signature and decode payload
    const payload = yield* verifyJWT(token)
    
    // Step 3: Derive workspace context from header and JWT payload
    const workspaceId = yield* deriveWorkspace(payload, headers)
    
    // Step 4: Build final RPC context
    const context = yield* buildContext(payload, workspaceId)
    
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
 * Helper: Create simple context for backward compatibility
 */
export function createSimpleContext(headers: Headers): Effect.Effect<{ userId: string; workspaceId: string }, ORPCError> {
  return createContext(headers).pipe(
    Effect.map((context) => ({
      userId: context.actorId,
      workspaceId: Option.getOrElse(context.workspaceId, () => "default" as WorkspaceId)
    }))
  )
}
