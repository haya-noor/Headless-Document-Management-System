/**
 * JWT Configuration
 * Contains JWT-related configuration settings
 */

import { getEnvVar } from './utils';
import { Schema as S } from "effect";
import { UserId, WorkspaceId } from "@/app/domain/refined/uuid";

export const JWT_CONFIG = {
  SECRET: getEnvVar('JWT_SECRET'),
  EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '24h'),
  HEADER_NAME: 'authorization',
  TOKEN_PREFIX: 'Bearer ',
  ALGORITHM: 'HS256' as const
} as const;

/**
 * JWT Payload Schema
 * Defines the structure of JWT tokens
 */
export const JWTPayloadSchema = S.Struct({
  sub: UserId, // Subject (user ID)
  iat: S.Number, // Issued at
  exp: S.Number, // Expires at
  roles: S.Array(S.Literal('admin', 'user')), // User roles
  workspaceId: S.optional(WorkspaceId), // Optional workspace context
  email: S.String, // User email
  firstName: S.String,
  lastName: S.String
});

export type JWTPayload = S.Schema.Type<typeof JWTPayloadSchema>;

/**
 * Decode and validate JWT payload
 */
export const decodeJWTPayload = (rawPayload: any): S.Schema.Effect<JWTPayload, S.ParseError> =>
  S.decodeUnknown(JWTPayloadSchema)(rawPayload);

/**
 * Extract user ID from JWT payload
 */
export function getUserIdFromPayload(payload: JWTPayload): UserId {
  return payload.sub;
}

/**
 * Extract workspace ID from JWT payload
 */
export function getWorkspaceId(payload: JWTPayload): S.Schema.Type<typeof S.optional(WorkspaceId)> {
  return payload.workspaceId;
}
